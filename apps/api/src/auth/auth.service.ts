import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      type: 'admin',
    });
    return { token, user: { id: user.id, email: user.email, name: user.name } };
  }

  /**
   * Troca a senha do administrador logado. Exige a senha atual — sem isso, um
   * token roubado viraria posse permanente da conta.
   */
  async changePassword(adminUserId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.adminUser.findUnique({ where: { id: adminUserId } });
    if (!user) {
      throw new UnauthorizedException('Sessão inválida, entre novamente');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('A nova senha precisa ser diferente da atual.');
    }

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
    });

    return { success: true };
  }
}
