import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@Req() req: { adminUser: { sub: string; email: string; name: string } }) {
    return req.adminUser;
  }

  @Patch('password')
  changePassword(
    @Req() req: { adminUser: { sub: string } },
    @Body() dto: ChangePasswordDto
  ) {
    return this.authService.changePassword(req.adminUser.sub, dto);
  }
}
