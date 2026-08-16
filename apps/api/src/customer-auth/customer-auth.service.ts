import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AsaasService } from '../asaas/asaas.service';
import { OrdersService } from '../orders/orders.service';
import {
  RegisterCustomerDto,
  LoginCustomerDto,
  SetPasswordDto,
  UpdateProfileDto,
} from './dto/customer-auth.dto';
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
  private readonly logger = new Logger(CustomerAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly email: EmailService,
    private readonly asaas: AsaasService,
    // Segunda via de cobrança é regra de pedido, não de conta: quem sabe falar
    // com o Asaas é o OrdersService.
    private readonly orders: OrdersService
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

  /**
   * Cadastro completo de quem está logado, para a tela "Meus dados".
   *
   * Separado de `me()` porque `me()` alimenta o cabeçalho e o contexto do site
   * inteiro — carregar endereço em toda página só para escrever "Olá, Isa" é
   * mandar dado pessoal para uma tela que não vai usar.
   */
  async profile(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        documentNumber: true,
        zipCode: true,
        street: true,
        number: true,
        complement: true,
        neighborhood: true,
        city: true,
        state: true,
      },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');
    return customer;
  }

  /**
   * Atualiza o próprio cadastro.
   *
   * `where: { id: customerId }` vem do token, nunca do corpo — é o que impede
   * alguém de mandar o id de outra pessoa e reescrever o endereço dela.
   *
   * Campo ausente fica como está; campo em branco vira null, para a pessoa
   * conseguir apagar um complemento que não usa mais. E-mail e CPF não passam
   * por aqui: os pedidos antigos guardam a própria cópia dos dois, então
   * mudança aqui não reescreve nota nenhuma já emitida.
   */
  async updateProfile(customerId: string, dto: UpdateProfileDto) {
    const limpo = <T extends string>(v?: string): string | null | undefined =>
      v === undefined ? undefined : v.trim() === '' ? null : (v.trim() as T);

    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        // Nome em branco derrubaria a saudação e o rótulo dos pedidos; se veio
        // vazio, mantém o que estava.
        ...(dto.name?.trim() ? { name: dto.name.trim() } : {}),
        phone: limpo(dto.phone),
        zipCode: limpo(dto.zipCode),
        street: limpo(dto.street),
        number: limpo(dto.number),
        complement: limpo(dto.complement),
        neighborhood: limpo(dto.neighborhood),
        city: limpo(dto.city),
        state: limpo(dto.state),
      },
    });

    return this.profile(customerId);
  }

  async myOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Como pagar um pedido que ainda está aguardando.
   *
   * O QR do Pix era buscado uma vez, no checkout, e guardado na sessão da aba.
   * Fechou a aba, perdeu — e a pessoa ficava com um pedido em aberto sem
   * nenhum caminho para pagar. Aqui ele é buscado de novo, na hora, direto do
   * Asaas.
   *
   * O `where` casa pedido E cliente: sem isso, trocar o id na URL daria acesso
   * ao pagamento de qualquer pedido da loja.
   */
  async orderPayment(customerId: string, orderId: string) {
    const encontrado = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      select: { id: true, status: true },
    });
    if (!encontrado) throw new NotFoundException('Pedido não encontrado');

    // Pedido em aberto sem cobrança ganha uma segunda via aqui. Sem isso o
    // painel abria vazio — foi o que aconteceu com quem comprou enquanto o
    // Asaas não respondia.
    if (encontrado.status === 'aguardando_pagamento') {
      await this.orders.ensureOpenPayment(encontrado.id);
    }

    const order = await this.prisma.order.findFirstOrThrow({
      where: { id: orderId, customerId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        paymentMethod: true,
        asaasPaymentId: true,
        asaasInvoiceUrl: true,
      },
    });

    if (order.status !== 'aguardando_pagamento') {
      return { ...order, pix: null, alreadyPaid: order.status !== 'cancelado' };
    }

    // O QR é tentado em qualquer cobrança aberta, não só nas que nasceram Pix:
    // a segunda via sai com tipo indefinido, e o Asaas serve Pix para ela
    // também. Cobrança que não aceita Pix simplesmente devolve erro, e aí
    // sobra o link da fatura.
    let pix: { encodedImage: string; payload: string; expirationDate?: string } | null = null;
    if (order.asaasPaymentId) {
      try {
        pix = await this.asaas.getPixQrCode(order.asaasPaymentId);
      } catch (err) {
        // QR indisponível não pode esconder o link da fatura, que é a outra
        // saída da pessoa.
        this.logger.warn(`Falha ao buscar QR do pedido ${order.orderNumber}: ${err}`);
      }
    }

    return { ...order, pix, alreadyPaid: false };
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
