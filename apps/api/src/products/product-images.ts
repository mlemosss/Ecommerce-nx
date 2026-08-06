import { createHash } from 'crypto';
import { apiBaseUrl } from '../common/request-context';

const DATA_URL = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

/** Reconhece uma URL servida por esta API e extrai a impressão digital da foto. */
const SERVED_URL = /\/images\/[^/]+\/([a-f0-9]{16})(?:\.[a-z0-9]+)?$/i;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function fingerprint(dataUrl: string): string {
  return createHash('sha1').update(dataUrl).digest('hex').slice(0, 16);
}

/** Lê o campo `images` (JSON em texto) sem estourar se vier corrompido. */
export function parseImages(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Troca as fotos gravadas em base64 por URLs desta API.
 *
 * As fotos são gravadas como dataURL no banco, o que fazia o catálogo inteiro
 * viajar embutido no JSON (~4 MB por carregamento, sem cache). Servidas por URL,
 * o JSON fica pequeno e cada foto é baixada uma vez e cacheada pelo navegador e
 * pela CDN. A URL carrega o hash do conteúdo, então nunca serve foto velha.
 *
 * Strings que já são URL (http/https) passam intactas.
 */
export function toPublicImageUrls(productId: string, images: string[]): string[] {
  const base = apiBaseUrl();
  return images.map((image) => {
    const match = DATA_URL.exec(image);
    if (!match) return image;
    const extension = EXTENSIONS[match[1].toLowerCase()] ?? 'jpg';
    return `${base}/images/${productId}/${fingerprint(image)}.${extension}`;
  });
}

/**
 * Caminho inverso: o admin devolve no PATCH as mesmas URLs que recebeu no GET.
 * Cada URL nossa volta a ser o dataURL correspondente já gravado — sem isso,
 * salvar um produto trocaria a foto pela URL dela e apagaria a imagem.
 */
export function toStoredImages(incoming: string[], stored: string[]): string[] {
  const byFingerprint = new Map<string, string>();
  for (const image of stored) {
    if (DATA_URL.test(image)) byFingerprint.set(fingerprint(image), image);
  }

  return incoming.map((image) => {
    const match = SERVED_URL.exec(image);
    if (!match) return image;
    return byFingerprint.get(match[1].toLowerCase()) ?? image;
  });
}

/** Acha, entre as fotos do produto, a que corresponde à URL pedida. */
export function findImage(
  images: string[],
  wantedFingerprint: string
): { mimeType: string; buffer: Buffer } | null {
  for (const image of images) {
    const match = DATA_URL.exec(image);
    if (!match || fingerprint(image) !== wantedFingerprint) continue;
    return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
  }
  return null;
}
