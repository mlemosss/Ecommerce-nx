import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { ShippingService } from './shipping.service';
import { QuoteShippingDto } from './dto/shipping.dto';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Public()
  @Post('quote')
  quote(@Body() dto: QuoteShippingDto) {
    return this.shippingService.quote(dto);
  }
}
