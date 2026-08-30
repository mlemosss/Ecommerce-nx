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

  /**
   * Resumo para o painel. Protegido pelo guard global.
   *
   * Aceita `dias` (janela contando de hoje para trás) ou o par `de`/`ate` em
   * formato ISO. `de` sozinho é um dia só — que é o recorte de quem quer saber
   * como foi ontem, ou o dia em que a campanha entrou no ar.
   */
  @Get('resumo')
  resumo(@Query('dias') dias?: string, @Query('de') de?: string, @Query('ate') ate?: string) {
    // Formato conferido aqui: data inválida viraria `Invalid Date` e a consulta
    // devolveria tudo, ou nada, sem ninguém entender por quê.
    const dataValida = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
    const janela = Number(dias);

    return this.metrics.resumo({
      de: dataValida(de),
      ate: dataValida(ate),
      dias: Number.isFinite(janela) && janela > 0 ? Math.min(janela, 365) : undefined,
    });
  }
}
