import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto, FindOrdersQueryDto, UpdateOrderStatusDto } from './dto/order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ) {
    // O Asaas exige o IP do comprador no cartão. Atrás da Vercel, o IP real
    // está no x-forwarded-for; req.ip seria o do proxy.
    const forwarded = req.headers['x-forwarded-for'];
    const remoteIp =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() || req.ip;

    return this.ordersService.create(dto, remoteIp);
  }

  @Get()
  findAll(@Query() query: FindOrdersQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  /**
   * Estorna e cancela. Devolve dinheiro de verdade — sem `@Public()`, cai no
   * guard global, so o painel autenticado chega aqui.
   */
  @Post(':id/estornar')
  refund(@Param('id') id: string) {
    return this.ordersService.refund(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  /**
   * Link de avaliação do pedido. Cria o token na hora se o pedido for anterior
   * ao dia em que passamos a gerar um no checkout.
   */
  @Post(':id/review-token')
  ensureReviewToken(@Param('id') id: string) {
    return this.ordersService.ensureReviewToken(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
