import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterCustomerDto, LoginCustomerDto } from './dto/customer-auth.dto';

function safeCustomer(customer: { id: string; name: string; email: string | null; phone: string | null }) {
  return { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone };
}

function withParsedImages<T extends { images: string }>(product: T): Omit<T, 'images'> & { images: string[] } {
  let images: string[];
  try {
    images = JSON.parse(product.images);
  } catch {
    images = [];
  }
  return { ...product, images };
}

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  private sign(customer: { id: string; email: string | null; name: string }) {
    return this.jwtService.sign({ sub: customer.id, email: customer.email, name: customer.name, type: 'customer' });
  }

  async register(dto: RegisterCustomerDto) {
    const existing = await this.prisma.customer.findUnique({ where: { email: dto.email } });
    if (existing?.passwordHash) {
      throw new ConflictException('Já existe uma conta com esse e-mail. Faça login.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const customer = existing
      ? await this.prisma.customer.update({
          where: { id: existing.id },
          data: { name: dto.name, passwordHash, phone: dto.phone ?? existing.phone },
        })
      : await this.prisma.customer.create({
          data: { name: dto.name, email: dto.email, passwordHash, phone: dto.phone },
        });

    return { token: this.sign(customer), customer: safeCustomer(customer) };
  }

  async login(dto: LoginCustomerDto) {
    const customer = await this.prisma.customer.findUnique({ where: { email: dto.email } });
    if (!customer?.passwordHash) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    const valid = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    return { token: this.sign(customer), customer: safeCustomer(customer) };
  }

  async me(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Cliente não encontrado');
    return safeCustomer(customer);
  }

  async myOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listFavorites(customerId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { customerId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    return favorites.map((f) => ({ ...f, product: withParsedImages(f.product) }));
  }

  async addFavorite(customerId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produto não encontrado');

    await this.prisma.favorite.upsert({
      where: { customerId_productId: { customerId, productId } },
      update: {},
      create: { customerId, productId },
    });
    return { success: true };
  }

  async removeFavorite(customerId: string, productId: string) {
    await this.prisma.favorite.deleteMany({ where: { customerId, productId } });
    return { success: true };
  }
}
