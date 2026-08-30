import { Injectable, NotFoundException } from '@nestjs/common';
import { apiBaseUrl } from '../common/request-context';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateReviewDto } from './dto/review.dto';


/**
 * A foto da cliente vira endereço, e não conteúdo.
 *
 * Guardada como dataURL em base64, ela ia inteira dentro do JSON e, dali, para
 * dentro do HTML da página — 4,7 MB na home. Servida por URL, o JSON fica
 * pequeno, o navegador baixa cada foto uma vez, e o Postgres para de mandar
 * megabytes a cada visita.
 */
function urlDaFoto(base: string, tipo: 'avaliacao' | 'depoimento', id: string): string {
  return `${base}/review-images/${tipo}/${id}.jpg`;
}

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
    /**
     * Duas consultas leves em vez de uma pesada.
     *
     * Esta roda em toda visita a uma página de produto, e o `photoUrl` guarda a
     * foto inteira em base64 — selecioná-lo só para testar se é nulo arrastaria
     * megabytes do Postgres a cada visita, que é a conta que já derrubou a loja.
     * A segunda consulta traz só os ids que têm foto.
     */
    const [encontradas, comFoto] = await Promise.all([
      this.prisma.productReview.findMany({
        where: { productId, approved: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          customerName: true,
          rating: true,
          comment: true,
          createdAt: true,
          orderId: true,
        },
      }),
      this.prisma.productReview.findMany({
        where: { productId, approved: true, photoUrl: { not: null } },
        select: { id: true },
      }),
    ]);

    const temFoto = new Set(comFoto.map((r) => r.id));
    const base = apiBaseUrl();

    const reviews = encontradas.map((r) => ({
      id: r.id,
      // Só o primeiro nome, como no mural: a página do produto não é lugar de
      // publicar o nome completo de quem comprou.
      customerName: r.customerName.trim().split(/\s+/)[0] ?? r.customerName,
      rating: r.rating,
      comment: r.comment,
      photoUrl: temFoto.has(r.id) ? urlDaFoto(base, 'avaliacao', r.id) : null,
      createdAt: r.createdAt,
      // Veio pelo link do pedido: há compra confirmada por trás.
      compraVerificada: r.orderId !== null,
    }));

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
   * O mural: as fotos que as clientes mandaram, com o que escreveram.
   *
   * Foto de cliente vestindo a peça é o formato de prova social que mais
   * converte em moda, e estava enterrada no fim da página de cada produto —
   * quem olhava a legging nunca via a foto de quem comprou o top. Reunidas,
   * viram a única coisa que a loja tem e a foto de estúdio não: a roupa em
   * gente de verdade, em corpos diferentes, na luz do banheiro de casa.
   *
   * Só aprovadas e só com foto — mural com espaço vazio não é mural. Campo a
   * campo porque isto é endpoint público: `customerId` e `orderId` ficam fora.
   */
  async mural(limite = 24) {
    const teto = Math.min(limite, 60);

    // Duas origens, uma parede. A avaliação de peça sabe qual peça é e leva
    // para ela; a avaliação da loja não tem produto atrás — vem de quem
    // comprou antes do site existir — e a foto dela vale igual. Deixar as duas
    // em muros separados era esconder metade das fotos que a loja tem.
    const [dePecas, daLoja] = await Promise.all([
      this.prisma.productReview.findMany({
        where: { approved: true, photoUrl: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: teto,
        // Sem `photoUrl`: o WHERE acima já garante que existe, e trazer a foto
        // em base64 só para descartá-la era o custo inteiro desta consulta.
        select: {
          id: true,
          rating: true,
          comment: true,
          customerName: true,
          createdAt: true,
          product: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.testimonial.findMany({
        where: { active: true, photoUrl: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: teto,
        select: {
          id: true,
          rating: true,
          quote: true,
          customerName: true,
          createdAt: true,
        },
      }),
    ]);

    // Só o primeiro nome. É como se assina uma foto entre conhecidas, e evita
    // que o mural vire uma lista de nomes completos de clientes.
    const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? '';

    return [
      ...dePecas.map((f) => ({
        id: f.id,
        photoUrl: urlDaFoto(base, 'avaliacao', f.id),
        rating: f.rating,
        comment: f.comment,
        customerName: primeiroNome(f.customerName),
        productName: f.product.name as string | null,
        productSlug: f.product.slug as string | null,
        createdAt: f.createdAt,
      })),
      ...daLoja.map((t) => ({
        id: t.id,
        photoUrl: urlDaFoto(base, 'depoimento', t.id),
        rating: t.rating,
        comment: t.quote,
        customerName: primeiroNome(t.customerName),
        productName: null,
        productSlug: null,
        createdAt: t.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, teto);
  }

  /**
   * Todas as avaliações aprovadas, para a página que reúne tudo.
   *
   * Espalhadas uma peça por vez, dez avaliações parecem dez lojas com uma
   * avaliação cada. Juntas, com a média e o total na frente, viram o número
   * que a pessoa procura antes de comprar de uma marca que não conhece.
   *
   * Mesmo cuidado do mural: campo a campo, sem `customerId` nem `orderId`, e
   * só o primeiro nome.
   */
  async publicas() {
    // Duas consultas leves, pelo mesmo motivo de `findForProduct`: trazer a
    // foto em base64 só para saber se ela existe custa megabytes por visita.
    const [aprovadas, comFoto] = await Promise.all([
      this.prisma.productReview.findMany({
        where: { approved: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          rating: true,
          comment: true,
          customerName: true,
          createdAt: true,
          orderId: true,
          product: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.productReview.findMany({
        where: { approved: true, photoUrl: { not: null } },
        select: { id: true },
      }),
    ]);

    const temFoto = new Set(comFoto.map((r) => r.id));
    const base = apiBaseUrl();
    const soma = aprovadas.reduce((total, r) => total + r.rating, 0);

    return {
      total: aprovadas.length,
      media: aprovadas.length ? soma / aprovadas.length : 0,
      avaliacoes: aprovadas.map((r) => ({
        id: r.id,
        photoUrl: temFoto.has(r.id) ? urlDaFoto(base, 'avaliacao', r.id) : null,
        rating: r.rating,
        comment: r.comment,
        customerName: r.customerName.trim().split(/\s+/)[0] ?? '',
        productName: r.product.name,
        productSlug: r.product.slug,
        createdAt: r.createdAt,
        // Veio pelo link do pedido, então há compra confirmada por trás. É a
        // diferença entre "alguém escreveu" e "alguém que comprou escreveu".
        compraVerificada: r.orderId !== null,
      })),
    };
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
