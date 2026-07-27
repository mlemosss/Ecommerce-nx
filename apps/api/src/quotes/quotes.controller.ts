import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto, UpdateQuoteStatusDto } from './dto/quote.dto';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  findAll() {
    return this.quotesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateQuoteDto) {
    return this.quotesService.create(dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateQuoteStatusDto) {
    return this.quotesService.updateStatus(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quotesService.remove(id);
  }
}
