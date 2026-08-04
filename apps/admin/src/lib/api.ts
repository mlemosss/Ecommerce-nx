import { clearToken, getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function resolveMediaUrl(path: string): string {
  return path.startsWith('http') || path.startsWith('data:') ? path : `${API_ORIGIN}${path}`;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Redimensiona e comprime a imagem no navegador antes de enviar.
 * As fotos vão como dataURL base64 no corpo da requisição; sem isso, fotos de
 * celular estouram o limite de tamanho ("request entity too large" / 413).
 * Mantém proporção, limita a maior dimensão e exporta em JPEG.
 */
export async function compressImageToDataUrl(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<string> {
  const original = await fileToDataUrl(file);

  // Formatos não-raster (ex.: SVG) ou ambiente sem canvas: envia como está.
  if (typeof document === 'undefined' || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return original;
  }

  try {
    const img = document.createElement('img');
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      img.src = original;
    });

    const largest = Math.max(img.width, img.height);
    const scale = largest > maxDimension ? maxDimension / largest : 1;
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, width, height);

    const compressed = canvas.toDataURL('image/jpeg', quality);
    // Usa o menor entre original e comprimido (evita casos raros de crescer).
    return compressed.length < original.length ? compressed : original;
  } catch {
    return original;
  }
}

export async function uploadProductImage(file: File): Promise<string> {
  const dataUrl = await compressImageToDataUrl(file);
  const { url } = await api.post<{ url: string }>('/uploads/products', { dataUrl });
  return url;
}

export async function uploadTestimonialPhoto(file: File): Promise<string> {
  const dataUrl = await compressImageToDataUrl(file);
  const { url } = await api.post<{ url: string }>('/uploads/testimonials', { dataUrl });
  return url;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    cache: 'no-store',
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
      window.location.href = '/admin/login';
    }
    throw new ApiError('Sessão expirada, faça login novamente', 401);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(message || `Erro ${res.status}`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
