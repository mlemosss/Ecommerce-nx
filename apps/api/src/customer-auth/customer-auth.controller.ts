import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { CustomerAccessible } from '../auth/customer-accessible.decorator';
import { LoginThrottleGuard } from '../auth/guards/login-throttle.guard';
import { CustomerAuthService } from './customer-auth.service';
import {
  RegisterCustomerDto,
  LoginCustomerDto,
  SetPasswordDto,
  ToggleFavoriteDto,
  UpdateProfileDto,
} from './dto/customer-auth.dto';

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
  @UseGuards(LoginThrottleGuard)
  @Post('login')
  login(@Body() dto: LoginCustomerDto) {
    return this.customerAuthService.login(dto);
  }

  /** Conclui a reivindicação de uma conta criada pelo checkout. */
  @Public()
  @Post('set-password')
  setPassword(@Body() dto: SetPasswordDto) {
    return this.customerAuthService.setPassword(dto);
  }

  @CustomerAccessible()
  @Get('me')
  me(@Req() req: CustomerRequest) {
    return this.customerAuthService.me(req.user.sub);
  }

  /** Meus dados, com endereço — a tela onde a pessoa confere e corrige. */
  @CustomerAccessible()
  @Get('me/profile')
  profile(@Req() req: CustomerRequest) {
    return this.customerAuthService.profile(req.user.sub);
  }

  @CustomerAccessible()
  @Patch('me/profile')
  updateProfile(@Req() req: CustomerRequest, @Body() dto: UpdateProfileDto) {
    return this.customerAuthService.updateProfile(req.user.sub, dto);
  }

  @CustomerAccessible()
  @Get('me/orders')
  myOrders(@Req() req: CustomerRequest) {
    return this.customerAuthService.myOrders(req.user.sub);
  }

  /**
   * Como pagar um pedido em aberto. Busca o QR do Pix na hora — ele era
   * guardado só na aba do checkout e se perdia ao fechar.
   */
  @CustomerAccessible()
  @Get('me/orders/:orderId/payment')
  orderPayment(@Req() req: CustomerRequest, @Param('orderId') orderId: string) {
    return this.customerAuthService.orderPayment(req.user.sub, orderId);
  }

  /** Baixar meus dados (LGPD art. 18, V). */
  @CustomerAccessible()
  @Get('me/export')
  exportData(@Req() req: CustomerRequest) {
    return this.customerAuthService.exportData(req.user.sub);
  }

  /** Excluir minha conta (LGPD art. 18, VI). */
  @CustomerAccessible()
  @Delete('me')
  deleteAccount(@Req() req: CustomerRequest) {
    return this.customerAuthService.deleteAccount(req.user.sub);
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
