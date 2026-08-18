import { Body, Controller, Param, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { EtiquetaService } from './etiqueta.service';
import { ShippingService } from './shipping.service';
import { QuoteShippingDto } from './dto/shipping.dto';

@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly etiqueta: EtiquetaService
  ) {}

  @Public()
  @Post('quote')
  quote(@Body() dto: QuoteShippingDto) {
    return this.shippingService.quote(dto);
  }

  /**
   * Compra a etiqueta do pedido. Gasta o saldo da carteira do Melhor Envio.
   *
   * Sem `@Public()`: cai no guard global, então só o painel autenticado chega
   * aqui. Endpoint que gasta dinheiro é o último lugar para relaxar isso.
   */
  @Post('etiqueta/:orderId')
  gerarEtiqueta(@Param('orderId') orderId: string) {
    return this.etiqueta.gerar(orderId);
  }
}
