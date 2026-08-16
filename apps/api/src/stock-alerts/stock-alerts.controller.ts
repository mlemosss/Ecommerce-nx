import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { StockAlertsService } from './stock-alerts.service';
import { CreateStockAlertDto } from './dto/stock-alert.dto';

@Controller('stock-alerts')
export class StockAlertsController {
  constructor(private readonly stockAlerts: StockAlertsService) {}

  /**
   * Público: é a loja, a pessoa não tem conta. O único dado coletado é o
   * e-mail, para uma finalidade única e declarada na própria tela — avisar
   * sobre aquela peça.
   */
  @Public()
  @Post()
  create(@Body() dto: CreateStockAlertDto) {
    return this.stockAlerts.create(dto);
  }

  /** Fila agregada por variação, para decidir reposição. Admin. */
  @Get('waitlist')
  waitlist() {
    return this.stockAlerts.waitlist();
  }

  /** Lista nominal: quem pediu, o quê e quando. Admin — é dado pessoal. */
  @Get()
  list() {
    return this.stockAlerts.listWithGaps();
  }

  /** Remove um pedido de aviso. Admin. */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stockAlerts.remove(id);
  }
}
