import { Body, Controller, Post } from '@nestjs/common';
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
}
