import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { CustomerAccessible } from '../auth/customer-accessible.decorator';
import { CustomerAuthService } from './customer-auth.service';
import { RegisterCustomerDto, LoginCustomerDto, ToggleFavoriteDto } from './dto/customer-auth.dto';

interface CustomerRequest {
  user: { sub: string };
}

@Controller('customer-auth')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterCustomerDto) {
    return this.customerAuthService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginCustomerDto) {
    return this.customerAuthService.login(dto);
  }

  @CustomerAccessible()
  @Get('me')
  me(@Req() req: CustomerRequest) {
    return this.customerAuthService.me(req.user.sub);
  }

  @CustomerAccessible()
  @Get('me/orders')
  myOrders(@Req() req: CustomerRequest) {
    return this.customerAuthService.myOrders(req.user.sub);
  }

  @CustomerAccessible()
  @Get('me/favorites')
  listFavorites(@Req() req: CustomerRequest) {
    return this.customerAuthService.listFavorites(req.user.sub);
  }

  @CustomerAccessible()
  @Post('me/favorites')
  addFavorite(@Req() req: CustomerRequest, @Body() dto: ToggleFavoriteDto) {
    return this.customerAuthService.addFavorite(req.user.sub, dto.productId);
  }

  @CustomerAccessible()
  @Delete('me/favorites/:productId')
  removeFavorite(@Req() req: CustomerRequest, @Param('productId') productId: string) {
    return this.customerAuthService.removeFavorite(req.user.sub, productId);
  }
}
