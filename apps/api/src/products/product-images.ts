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
 *
 * `baseOverride` existe para resposta que vai para cache compartilhado. O padrão
 * é o host de quem pediu, o que é certo para o catálogo (a loja chama a API
 * direto) e errado para o feed do Meta: ele é servido também pelo domínio da
 * loja, por reescrita, e ali o host de quem pediu é `noexcusenx.com.br` — que
 * não serve `/api/images`. Como o cache é por URL e não por host, a primeira
 * resposta contaminava as duas. Ver `meta.service.ts`.
 */
export function toPublicImageUrls(
  productId: string,
  images: string[],
  baseOverride?: string
): string[] {
  const base = baseOverride ?? apiBaseUrl();
  return images.map((image) => {
    const match = DATA_URL.exec(image);
    if (!match) return image;
    const extension = EXTENSIONS[match[1].toLowerCase()] ?? 'jpg';
    return `${base}/images/${productId}/${fingerprint(image)}.${extension}`;
  });
}

/**
 * A ficha de uma foto: o suficiente para montar a URL, e nada do peso dela.
 *
 * `h` e a impressao digital do conteudo e `e` a extensao, para as fotos
 * gravadas em base64. `u` guarda o endereco inteiro das que ja chegaram como
 * URL externa e passam intactas.
 */
export type ImageMeta = { h: string; e: string } | { u: string };

/** Calcula a ficha das fotos. Roda uma vez, na hora de gravar. */
export function buildImageMeta(images: string[]): ImageMeta[] {
  return images.map((image) => {
    const match = DATA_URL.exec(image);
    if (!match) return { u: image };
    return {
      h: fingerprint(image),
      e: EXTENSIONS[match[1].toLowerCase()] ?? 'jpg',
    };
  });
}

export function parseImageMeta(raw: string | null): ImageMeta[] | null {
  if (raw === null || raw === undefined) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ImageMeta[]) : null;
  } catch {
    return null;
  }
}

/**
 * Monta as URLs a partir da ficha, sem tocar nas fotos.
 *
 * E o caminho que o catalogo e o feed usam. O caminho antigo, que le as fotos
 * inteiras, so sobrou para calcular a ficha de quem ainda nao tem.
 */
export function urlsFromMeta(
  productId: string,
  meta: ImageMeta[],
  baseOverride?: string
): string[] {
  const base = baseOverride ?? apiBaseUrl();
  return meta.map((item) =>
    'u' in item ? item.u : `${base}/images/${productId}/${item.h}.${item.e}`
  );
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
