import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { AbandonedCartService } from './abandoned-cart.service';
import { TrackAbandonedCartDto } from './dto/abandoned-cart.dto';

@Controller('abandoned-cart')
export class AbandonedCartController {
  constructor(private readonly abandonedCartService: AbandonedCartService) {}

  @Public()
  @Post()
  track(@Body() dto: TrackAbandonedCartDto) {
    return this.abandonedCartService.track(dto);
  }

  /** Carrinhos parados, para chamar no WhatsApp. So admin. */
  @Get()
  pendingRecovery() {
    return this.abandonedCartService.pendingRecovery();
  }

  /** Tira da lista sem ter comprado: ja foi conversado, nao insiste. */
  @Post(':id/dispensar')
  dismiss(@Param('id') id: string) {
    return this.abandonedCartService.dismiss(id);
  }

  /** Descadastro pelo link do e-mail. Público de propósito: exigir login para
   *  sair de uma lista é o oposto do que a LGPD espera. */
  @Public()
  @Post(':id/unsubscribe')
  unsubscribe(@Param('id') id: string) {
    return this.abandonedCartService.unsubscribe(id);
  }
}
