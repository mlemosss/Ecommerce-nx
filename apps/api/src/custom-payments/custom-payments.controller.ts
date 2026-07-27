import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CustomPaymentsService } from './custom-payments.service';
import { CreateCustomPaymentDto } from './dto/custom-payment.dto';

@Controller('custom-payments')
export class CustomPaymentsController {
  constructor(private readonly customPaymentsService: CustomPaymentsService) {}

  @Get()
  findAll() {
    return this.customPaymentsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateCustomPaymentDto) {
    return this.customPaymentsService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customPaymentsService.remove(id);
  }
}
