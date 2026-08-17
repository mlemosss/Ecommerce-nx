import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService
  ) {}

  /**
   * Valida a foto antes de gravar. O endpoint do link é público, então aceitar
   * a string como veio deixaria qualquer um guardar qualquer coisa no banco.
   * Passa pela mesma checagem de tipo e tamanho da foto de produto.
   */
  private validarFoto(photoUrl?: string): string | null {
    if (!photoUrl?.trim()) return null;
    return this.uploads.validateProductImage(photoUrl).url;
  }

  async findForProduct(productId: string) {
    const reviews = await this.prisma.productReview.findMany({
      where: { productId, approved: true },
      orderBy: { createdAt: 'desc' },
    });
    const count = reviews.length;
    const average = count === 0 ? 0 : reviews.reduce((sum, r) => sum + r.rating, 0) / count;
    return { reviews, average, count };
  }

  findAll() {
    return this.prisma.productReview.findMany({
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Quem já recebeu a peça e ainda não avaliou.
   *
   * A loja tem zero avaliações, e é o que mais pesa numa marca que ninguém
   * conhece: roupa fitness se compra sem provar, e a única coisa que resolve é
   * outra mulher dizendo que serviu.
   *
   * O link por pedido já existia — mas só dentro do pedido, um a um. Quem
   * quisesse pedir a dez clientes precisava abrir dez pedidos e lembrar em qual
   * tinha parado. Aqui sai a lista pronta, na ordem de quem recebeu primeiro:
   * é quem já usou a peça e tem o que dizer.
   *
   * Só pedido `enviado`. Pedido pago e não postado ainda não chegou na casa de
   * ninguém, e pedir avaliação de peça que a pessoa não viu é o jeito mais
   * rápido de receber uma avaliação ruim merecida.
   */
  async pendingRequests() {
    const pedidos = await this.prisma.order.findMany({
      where: { status: 'enviado', shippedAt: { not: null } },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        reviewToken: true,
        shippedAt: true,
        reviewRequestSentAt: true,
        items: { select: { productName: true } },
      },
      orderBy: { shippedAt: 'asc' },
    });

    // Um pedido some da lista quando qualquer peça dele já foi avaliada: já deu
    // o que tinha para dar, e insistir vira cobrança.
    const avaliados = await this.prisma.productReview.findMany({
      where: { orderId: { in: pedidos.map((p) => p.id) } },
      select: { orderId: true },
    });
    const jaAvaliou = new Set(avaliados.map((a) => a.orderId));

    return pedidos
      .filter((p) => !jaAvaliou.has(p.id))
      .map((p) => ({
        id: p.id,
        orderNumber: p.orderNumber,
        customerName: p.customerName,
        customerPhone: p.customerPhone,
        reviewToken: p.reviewToken,
        shippedAt: p.shippedAt,
        /** Já saiu o e-mail automático? Serve para não parecer insistência. */
        emailEnviadoEm: p.reviewRequestSentAt,
        produtos: [...new Set(p.items.map((i) => i.productName))],
      }));
  }

  async create(customerId: string, customerName: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Produto não encontrado');

    return this.prisma.productReview.create({
      data: {
        productId: dto.productId,
        customerId,
        customerName,
        rating: dto.rating,
        comment: dto.comment,
        photoUrl: this.validarFoto(dto.photoUrl),
      },
    });
  }

  /**
   * Abre a tela de avaliação a partir do token do pedido.
   *
   * Público: a loja é de compra sem cadastro, então quem comprou não tem senha.
   * O token é a credencial — devolve só o que a pessoa precisa para avaliar
   * aquele pedido, e nada mais. Nome, e-mail, CPF, endereço e valores ficam de
   * fora: quem tem o link consegue avaliar, não consultar o pedido.
   */
  async findByToken(token: string) {
    const order = await this.prisma.order.findUnique({
      where: { reviewToken: token },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        items: { select: { productId: true, productName: true, color: true, size: true } },
      },
    });
    if (!order) throw new NotFoundException('Link de avaliação inválido ou expirado.');

    // O que já foi avaliado neste pedido volta preenchido, para reabrir o link
    // mostrar o que a pessoa escreveu em vez de parecer que nada foi salvo.
    const jaAvaliados = await this.prisma.productReview.findMany({
      where: { orderId: order.id },
      select: { productId: true, rating: true, comment: true, photoUrl: true },
    });
    const porProduto = new Map(jaAvaliados.map((r) => [r.productId, r]));

    // Um produto pode aparecer em duas linhas do pedido (cores diferentes);
    // avalia-se o produto, não a variação.
    const vistos = new Set<string>();
    const produtos = order.items
      .filter((i) => !vistos.has(i.productId) && vistos.add(i.productId))
      .map((i) => ({
        productId: i.productId,
        productName: i.productName,
        avaliacao: porProduto.get(i.productId) ?? null,
      }));

    return {
      orderNumber: order.orderNumber,
      // Só o primeiro nome: a tela cumprimenta a pessoa sem expor o nome
      // completo a quem receber o link encaminhado.
      firstName: order.customerName.trim().split(/\s+/)[0] ?? '',
      produtos,
    };
  }

  /**
   * Grava a avaliação vinda do link.
   *
   * O nome sai do pedido e não do formulário — campo livre de nome vira
   * qualquer coisa. `orderId` + `productId` tem índice único, então reenviar
   * atualiza em vez de duplicar.
   */
  async createFromToken(token: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { reviewToken: token },
      select: { id: true, customerId: true, customerName: true, items: { select: { productId: true } } },
    });
    if (!order) throw new NotFoundException('Link de avaliação inválido ou expirado.');

    // Só produtos que estão no pedido: o token não é permissão para avaliar o
    // catálogo inteiro.
    if (!order.items.some((i) => i.productId === dto.productId)) {
      throw new NotFoundException('Este produto não faz parte do pedido.');
    }

    const foto = this.validarFoto(dto.photoUrl);

    return this.prisma.productReview.upsert({
      where: { orderId_productId: { orderId: order.id, productId: dto.productId } },
      update: { rating: dto.rating, comment: dto.comment, photoUrl: foto },
      create: {
        productId: dto.productId,
        orderId: order.id,
        customerId: order.customerId ?? '',
        customerName: order.customerName,
        rating: dto.rating,
        comment: dto.comment,
        photoUrl: foto,
      },
    });
  }

  async setApproved(id: string, approved: boolean) {
    const review = await this.prisma.productReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Avaliação não encontrada');
    return this.prisma.productReview.update({ where: { id }, data: { approved } });
  }

  async remove(id: string) {
    const review = await this.prisma.productReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Avaliação não encontrada');
    await this.prisma.productReview.delete({ where: { id } });
    return { success: true };
  }
}
