import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { MetricsService } from './metrics.service';
import { RegistrarVisitaDto } from './dto/metrics.dto';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  /**
   * Uma visita a mais. Público, porque quem visita a loja não tem login.
   *
   * Responde sempre `{ ok: true }`, mesmo quando não gravou. O navegador não
   * tem o que fazer com um erro daqui, e uma tela de loja que reclama porque o
   * contador falhou é pior do que um número um pouco baixo.
   */
  @Public()
  @Post('view')
  registrar(@Body() dto: RegistrarVisitaDto) {
    return this.metrics.registrar(dto.rota, dto.novaSessao === true);
  }

  /** Resumo para o painel. Protegido pelo guard global. */
  @Get('resumo')
  resumo(@Query('dias') dias?: string) {
    const janela = Number(dias);
    return this.metrics.resumo(Number.isFinite(janela) && janela > 0 ? Math.min(janela, 180) : 30);
  }
}
