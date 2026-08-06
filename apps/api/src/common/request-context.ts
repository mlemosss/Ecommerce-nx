import { AsyncLocalStorage } from 'async_hooks';
import type { Request, Response, NextFunction } from 'express';

interface RequestContext {
  /** Raiz pública da API desta requisição, ex.: https://noexcuse-api.vercel.app/api */
  apiBaseUrl: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Guarda a URL pública da API da requisição em curso. É assim que as URLs de
 * imagem saem absolutas (a loja consome a API de outro domínio) sem depender de
 * variável de ambiente configurada à mão em cada projeto da Vercel.
 */
export function requestContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const forwardedProto = String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] ?? req.headers.host;

  if (!host) {
    next();
    return;
  }

  storage.run({ apiBaseUrl: `${protocol}://${host}/api` }, next);
}

/** Fora de uma requisição (cron, seed) cai no env e, por último, no localhost. */
export function apiBaseUrl(): string {
  const fromRequest = storage.getStore()?.apiBaseUrl;
  if (fromRequest) return fromRequest;
  return (process.env.API_PUBLIC_URL || 'http://localhost:3333/api').replace(/\/$/, '');
}
