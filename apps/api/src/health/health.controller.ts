import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * O banco esta de pe?
 *
 * Existe para a loja saber, a cada visita, se mostra o aviso de instabilidade
 * — e por isso precisa ser barato. Um `SELECT 1` nao le linha nenhuma: nao
 * atravessa dado nenhum na conta de transferencia, que foi exatamente o que
 * derrubou o banco em 18/08/2026.
 *
 * Perguntar isso ao catalogo seria repetir o erro em escala menor.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true };
    } catch {
      throw new ServiceUnavailableException({ ok: false });
    }
  }
}
