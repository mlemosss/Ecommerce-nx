import { Controller, Get, Header, Param, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { MetaService } from './meta.service';

@Controller('meta')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  /**
   * Feed de produtos que o Meta busca sozinho.
   *
   * Público de propósito: o Commerce Manager agenda uma busca nesta URL e não
   * tem como se autenticar. O conteúdo é o mesmo catálogo que a loja já publica
   * em `/catalog/products` — nome, preço, foto e estoque de peça à venda. Não
   * há nada aqui que um visitante do site não veja.
   *
   * Cache de 10 minutos na borda: o Meta relê o feed com frequência e não faz
   * sentido cada leitura varrer o banco.
   */
  @Public()
  @Get('feed.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=600, s-maxage=600')
  @Header('Content-Disposition', 'inline; filename="noexcuse-catalogo-meta.csv"')
  async feed() {
    // BOM para o Excel abrir os acentos corretamente quando o lojista baixa o
    // arquivo para conferir. O Meta ignora o BOM.
    return `﻿${await this.metaService.feedCsv()}`;
  }

  @Get('status')
  status() {
    return this.metaService.status();
  }

  @Post('sync')
  sync() {
    return this.metaService.syncProducts();
  }

  @Get('batch-status/:handle')
  batchStatus(@Param('handle') handle: string) {
    return this.metaService.batchStatus(handle);
  }
}
