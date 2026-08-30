import { Controller, Get, Headers, Logger, UnauthorizedException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { EmailSchedulerService } from './email-scheduler.service';

@Controller('email-flow')
export class EmailSchedulerController {
  private readonly logger = new Logger(EmailSchedulerController.name);

  constructor(private readonly scheduler: EmailSchedulerService) {}

  /**
   * A varredura periódica: e-mails agendados e envios postados.
   *
   * `@Public()` porque quem chama é o cron da Vercel, que não tem sessão — mas
   * público não pode significar aberto. Esta rota manda e-mail para clientes
   * reais, consulta o Melhor Envio com o token da carteira e devolve as
   * contagens de pedidos e carrinhos da loja. Qualquer visitante podia
   * disparar tudo isso e ler os números.
   *
   * Mesmo desenho do webhook do Asaas, inclusive a parte que importa: **falha
   * fechada**. Sem o segredo definido, ninguém entra — nem o cron. É melhor a
   * varredura parar e alguém perceber do que ficar exposta em silêncio.
   *
   * Na Vercel, o cron manda `Authorization: Bearer <CRON_SECRET>` sozinho
   * quando a variável existe no projeto.
   */
  @Public()
  @Get('run-scheduled')
  runScheduled(@Headers('authorization') authorization?: string) {
    const segredo = process.env.CRON_SECRET;

    if (!segredo) {
      this.logger.error(
        'CRON_SECRET não configurada: varredura de e-mails recusada. ' +
          'Defina a variável na API — a Vercel manda o mesmo valor no cron automaticamente.'
      );
      throw new UnauthorizedException('Rotina não configurada');
    }

    if (authorization !== `Bearer ${segredo}`) {
      throw new UnauthorizedException('Não autorizado');
    }

    return this.scheduler.runScheduled();
  }
}
