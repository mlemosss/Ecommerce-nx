import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterCustomerDto, LoginCustomerDto, SetPasswordDto } from './dto/customer-auth.dto';
import { parseImages, toPublicImageUrls } from '../products/product-images';

/** Uma hora é bastante para clicar no link e curto para um token vazado. */
const TOKEN_TTL_MS = 60 * 60 * 1000;

function safeCustomer(customer: { id: string; name: string; email: string | null; phone: string | null }) {
  return { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone };
}

function withParsedImages<T extends { id: string; images: string }>(
  product: T
): Omit<T, 'images'> & { images: string[] } {
  return { ...product, images: toPublicImageUrls(product.id, parseImages(product.images)) };
}

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly email: EmailService
  ) {}

  private sign(customer: { id: string; email: string | null; name: string }) {
    return this.jwtService.sign({ sub: customer.id, email: customer.email, name: customer.name, type: 'customer' });
  }

  async register(dto: RegisterCustomerDto) {
    const existing = await this.prisma.customer.findUnique({ where: { email: dto.email } });
    if (existing?.passwordHash) {
      throw new ConflictException('Já existe uma conta com esse e-mail. Faça login.');
    }

    // Registro já existe sem senha: foi criado por uma compra feita sem cadastro,
    // e carrega CPF, telefone, endereço e histórico. Deixar definir a senha aqui
    // entregaria a conta a quem apenas soubesse o e-mail. Só por confirmação.
    if (existing) {
      await this.sendPasswordSetupLink(existing.id, existing.email, existing.name);
      return {
        pendingEmailConfirmation: true,
        message:
          'Você já tem pedidos com esse e-mail. Enviamos um link para concluir o cadastro e definir sua senha.',
      };
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const customer = await this.prisma.customer.create({
      data: { name: dto.name, email: dto.email, passwordHash, phone: dto.phone },
    });

    return { token: this.sign(customer), customer: safeCustomer(customer) };
  }

  /** Gera o token de uso único e manda o link por e-mail. */
  private async sendPasswordSetupLink(
    customerId: string,
    email: string | null,
    name: string
  ): Promise<void> {
    if (!email) return;

    const token = randomBytes(32).toString('hex');
    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        passwordSetToken: token,
        passwordSetTokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    await this.email.sendPasswordSetup({ email, name, token });
  }

  /** Conclui a reivindicação: valida o token e grava a senha. */
  async setPassword(dto: SetPasswordDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { passwordSetToken: dto.token },
    });

    if (
      !customer ||
      !customer.passwordSetTokenExpiresAt ||
      customer.passwordSetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Link inválido ou expirado. Peça um novo cadastro.');
    }

    const updated = await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash: await bcrypt.hash(dto.password, 10),
        // Token é de uso único.
        passwordSetToken: null,
        passwordSetTokenExpiresAt: null,
      },
    });

    return { token: this.sign(updated), customer: safeCustomer(updated) };
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

  /**
   * Portabilidade (LGPD art. 18, V): devolve tudo que a loja guarda sobre a
   * pessoa, num JSON que ela baixa pela própria conta.
   */
  async exportData(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        orders: { include: { items: true }, orderBy: { createdAt: 'desc' } },
        favorites: { include: { product: { select: { name: true, slug: true } } } },
      },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    const reviews = await this.prisma.productReview.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });

    // A senha nunca sai, nem em hash.
    const { passwordHash, passwordSetToken, passwordSetTokenExpiresAt, ...cadastro } = customer;
    void passwordHash;
    void passwordSetToken;
    void passwordSetTokenExpiresAt;

    return {
      geradoEm: new Date().toISOString(),
      cadastro,
      avaliacoes: reviews,
    };
  }

  /**
   * Exclusão (LGPD art. 18, VI). O pedido em si não é apagado — a legislação
   * fiscal exige guardá-lo —, mas os dados pessoais dele são substituídos por
   * marcadores, de forma que o histórico de vendas continua correto e a pessoa
   * deixa de estar identificada.
   */
  async deleteAccount(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    await this.prisma.$transaction(async (tx) => {
      await tx.favorite.deleteMany({ where: { customerId } });
      await tx.productReview.deleteMany({ where: { customerId } });
      if (customer.email) {
        await tx.abandonedCart.deleteMany({ where: { email: customer.email } });
      }

      await tx.order.updateMany({
        where: { customerId },
        data: {
          customerName: 'Cliente removido',
          customerEmail: `removido+${customer.id}@noexcusenx.com.br`,
          customerPhone: '',
          customerDocument: '',
          street: 'removido',
          number: '-',
          complement: null,
        },
      });

      await tx.customer.delete({ where: { id: customerId } });
    });

    return { success: true };
  }
}
