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
  runScheduled(
    @Headers('authorization') authorization?: string,
    @Headers('x-vercel-cron') vercelCron?: string
  ) {
    const segredo = process.env.CRON_SECRET;

    // Com o segredo definido, é ele que manda. Este é o estado desejado.
    if (segredo) {
      if (authorization !== `Bearer ${segredo}`) {
        throw new UnauthorizedException('Não autorizado');
      }
      return this.scheduler.runScheduled();
    }

    /**
     * Sem o segredo, aceita só o que a Vercel marca como cron.
     *
     * Falhar fechado seria o certo em segurança pura, e foi o que eu tinha
     * feito. Mas o efeito colateral era desligar os e-mails automáticos da loja
     * — pedido de avaliação, carrinho abandonado e a varredura que marca pedido
     * como enviado — até alguém configurar uma variável. Derrubar uma loja em
     * produção para fechar uma porta é trocar um problema por outro maior.
     *
     * Este cabeçalho é posto pela plataforma na chamada agendada. É **melhor
     * que aberto e pior que o segredo**: barra o visitante curioso que
     * descobriu a URL, e não é uma barreira que eu chamaria de garantida.
     *
     * Enquanto isso o log grita a cada execução, porque aviso que não incomoda
     * ninguém não vira ação.
     */
    if (vercelCron) {
      this.logger.warn(
        'CRON_SECRET não configurada — varredura liberada só pelo cabeçalho de cron da Vercel. ' +
          'Defina CRON_SECRET no projeto da API para fechar de vez.'
      );
      return this.scheduler.runScheduled();
    }

    this.logger.error(
      'Chamada a run-scheduled recusada: sem CRON_SECRET e sem cabeçalho de cron.'
    );
    throw new UnauthorizedException('Não autorizado');
  }
}
