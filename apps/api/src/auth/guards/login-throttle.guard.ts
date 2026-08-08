import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface Attempt {
  count: number;
  resetAt: number;
}

/**
 * Limita tentativas de login por IP + e-mail.
 *
 * Sem isto, força bruta era o caminho mais barato para a base inteira de
 * clientes — ainda mais com o e-mail do administrador sendo conhecido.
 *
 * Ressalva honesta: a contagem vive na memória da instância. Em serverless há
 * várias instâncias e elas reiniciam, então o limite real é por instância, não
 * global. Isso encarece muito o ataque, mas não o torna impossível; um limite
 * de verdade exigiria contador compartilhado (banco ou Redis).
 */
@Injectable()
export class LoginThrottleGuard implements CanActivate {
  private readonly attempts = new Map<string, Attempt>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = this.keyFor(request);
    const now = Date.now();

    const current = this.attempts.get(key);
    if (!current || current.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
      this.evictExpired(now);
      return true;
    }

    if (current.count >= MAX_ATTEMPTS) {
      const minutes = Math.max(1, Math.ceil((current.resetAt - now) / 60000));
      throw new HttpException(
        `Muitas tentativas de login. Tente novamente em ${minutes} minuto(s).`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    current.count += 1;
    return true;
  }

  private keyFor(request: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
    body?: { email?: string };
  }): string {
    const forwarded = request.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() ||
      request.ip ||
      'desconhecido';
    const email = (request.body?.email ?? '').toLowerCase().trim();
    return `${ip}|${email}`;
  }

  /** Impede que o mapa cresça sem limite ao longo da vida da instância. */
  private evictExpired(now: number): void {
    for (const [key, attempt] of this.attempts) {
      if (attempt.resetAt <= now) this.attempts.delete(key);
    }
  }
}
