import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../public.decorator';
import { IS_CUSTOMER_ACCESSIBLE_KEY } from '../customer-accessible.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException('Token não informado');
    }

    let payload: Record<string, unknown>;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const isCustomerAccessible = this.reflector.getAllAndOverride<boolean>(
      IS_CUSTOMER_ACCESSIBLE_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Rotas não marcadas explicitamente como acessíveis a clientes são admin-only por
    // padrão: um token de cliente não deve conseguir acessar dados administrativos.
    if (payload.type === 'customer' && !isCustomerAccessible) {
      throw new UnauthorizedException('Acesso não permitido');
    }

    request.adminUser = payload;
    request.user = payload;
    return true;
  }
}
