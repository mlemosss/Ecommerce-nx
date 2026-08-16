import { Body, Controller, Get, Post } from '@nestjs/common';
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

  /** Fila de espera para o painel. Admin — é dado de cliente. */
  @Get('waitlist')
  waitlist() {
    return this.stockAlerts.waitlist();
  }
}
