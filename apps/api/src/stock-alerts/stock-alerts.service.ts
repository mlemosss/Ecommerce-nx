import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateStockAlertDto } from './dto/stock-alert.dto';

@Injectable()
export class StockAlertsService {
  private readonly logger = new Logger(StockAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EmailService))
    private readonly email: EmailService
  ) {}

  /**
   * Registra o pedido de aviso.
   *
   * `upsert` na chave (produto, cor, tamanho, e-mail): pedir de novo não cria
   * uma segunda linha nem manda dois e-mails depois. Se a pessoa já tinha sido
   * avisada e voltou a pedir — porque esgotou outra vez —, o registro volta a
   * "esperando".
   */
  async create(dto: CreateStockAlertDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, active: true, name: true },
    });
    if (!product || !product.active) {
      throw new NotFoundException('Produto não encontrado');
    }

    const email = dto.email.trim().toLowerCase();
    const color = dto.color.trim();
    const size = dto.size.trim();
    if (!color || !size) {
      throw new BadRequestException('Informe a cor e o tamanho que você quer.');
    }

    // Já tem estoque? Então não há o que esperar — a tela deve deixar comprar.
    const variant = await this.prisma.productVariant.findFirst({
      where: { productId: product.id, color, size },
      select: { stock: true },
    });
    if (variant && variant.stock > 0) {
      return { registered: false, available: true };
    }

    // Descobre se já existia antes de gravar: o agradecimento sai uma vez por
    // pedido, não a cada reenvio do formulário. Sem isso, quem clicasse duas
    // vezes receberia dois e-mails — e um formulário público que dispara
    // e-mail a cada POST vira ferramenta de incomodar terceiro.
    const jaExistia = await this.prisma.stockAlert.findUnique({
      where: { productId_color_size_email: { productId: product.id, color, size, email } },
      select: { id: true },
    });

    await this.prisma.stockAlert.upsert({
      where: {
        productId_color_size_email: { productId: product.id, color, size, email },
      },
      update: { notifiedAt: null },
      create: { productId: product.id, color, size, email },
    });

    if (!jaExistia) {
      // Fora do caminho crítico: falha de e-mail não pode fazer a pessoa achar
      // que o cadastro não funcionou.
      this.enviarAgradecimento(email, product.name, color, size).catch((err) =>
        this.logger.error(`Falha no e-mail de agradecimento para ${email}: ${err}`)
      );
    }

    return { registered: true, available: false };
  }

  /**
   * Agradece e mostra o que já existe no tamanho pedido.
   *
   * Sai na hora, e não quando a peça volta: a reposição pode demorar semanas e
   * quem acabou de deixar o e-mail está com a loja aberta agora. Se não houver
   * nada disponível naquele tamanho, o e-mail sai sem vitrine em vez de
   * inventar uma.
   */
  private async enviarAgradecimento(
    email: string,
    productName: string,
    color: string,
    size: string
  ): Promise<void> {
    const comEstoque = await this.prisma.product.findMany({
      where: {
        active: true,
        variants: { some: { size, stock: { gt: 0 } } },
      },
      select: { name: true, slug: true, price: true },
      orderBy: { name: 'asc' },
      take: 4,
    });

    await this.email.sendStockAlertWelcome({
      email,
      productName,
      color,
      size,
      outras: comEstoque,
    });
  }

  /**
   * Avisa quem estava esperando peça que voltou ao estoque.
   *
   * Roda no varredor de 30 em 30 minutos em vez de ser chamado onde o estoque
   * muda. O estoque sobe por três caminhos — a tela de estoque, o cancelamento
   * de pedido e o cadastro de variação nova —, e pendurar a chamada nos três
   * garante que o quarto, quando existir, seja esquecido. Meia hora de atraso
   * num aviso de reposição não custa nada.
   */
  async notifyRestocked(): Promise<{ notified: number }> {
    const pendentes = await this.prisma.stockAlert.findMany({
      where: { notifiedAt: null },
      include: { product: { select: { id: true, name: true, slug: true, active: true } } },
    });
    if (pendentes.length === 0) return { notified: 0 };

    // Uma consulta de estoque por variação pedida, e não por alerta: várias
    // pessoas costumam esperar a mesma peça.
    const chaves = new Map<string, { productId: string; color: string; size: string }>();
    for (const a of pendentes) {
      chaves.set(`${a.productId}|${a.color}|${a.size}`, {
        productId: a.productId,
        color: a.color,
        size: a.size,
      });
    }

    const comEstoque = new Set<string>();
    for (const [chave, v] of chaves) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { productId: v.productId, color: v.color, size: v.size },
        select: { stock: true },
      });
      if (variant && variant.stock > 0) comEstoque.add(chave);
    }

    let notified = 0;
    for (const alerta of pendentes) {
      const chave = `${alerta.productId}|${alerta.color}|${alerta.size}`;
      if (!comEstoque.has(chave) || !alerta.product.active) continue;

      try {
        await this.email.sendBackInStock({
          email: alerta.email,
          productName: alerta.product.name,
          slug: alerta.product.slug,
          color: alerta.color,
          size: alerta.size,
        });
        // Marca depois de enviar: se o envio falhar, ele tenta de novo daqui a
        // meia hora em vez de a pessoa nunca ser avisada.
        await this.prisma.stockAlert.update({
          where: { id: alerta.id },
          data: { notifiedAt: new Date() },
        });
        notified += 1;
      } catch (err) {
        this.logger.error(`Falha ao avisar ${alerta.email} sobre ${alerta.product.name}: ${err}`);
      }
    }

    if (notified > 0) this.logger.log(`Avisos de reposição enviados: ${notified}`);
    return { notified };
  }

  /**
   * Fila de espera para o painel: o que as pessoas pediram e a loja não tinha.
   *
   * É a lista de reposição mais honesta que existe — não é estimativa de
   * demanda, é gente que chegou na peça, escolheu cor e tamanho e deixou o
   * e-mail. Ordena pelo que mais gente espera.
   */
  async waitlist() {
    const pendentes = await this.prisma.stockAlert.findMany({
      where: { notifiedAt: null },
      include: { product: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const porVariacao = new Map<
      string,
      { productId: string; productName: string; slug: string; color: string; size: string; count: number; lastAt: Date }
    >();

    for (const a of pendentes) {
      const chave = `${a.productId}|${a.color}|${a.size}`;
      const atual = porVariacao.get(chave);
      if (atual) {
        atual.count += 1;
        if (a.createdAt > atual.lastAt) atual.lastAt = a.createdAt;
      } else {
        porVariacao.set(chave, {
          productId: a.productId,
          productName: a.product.name,
          slug: a.product.slug,
          color: a.color,
          size: a.size,
          count: 1,
          lastAt: a.createdAt,
        });
      }
    }

    return [...porVariacao.values()].sort(
      (a, b) => b.count - a.count || b.lastAt.getTime() - a.lastAt.getTime()
    );
  }

  /**
   * Lista nominal para o painel: quem pediu, o quê e quando.
   *
   * É dado pessoal, então a rota é admin. Traz também os já avisados, marcados
   * — sem eles a lojista não consegue conferir se o aviso saiu de fato.
   */
  async list() {
    const alertas = await this.prisma.stockAlert.findMany({
      include: { product: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return alertas.map((a) => ({
      id: a.id,
      email: a.email,
      productId: a.product.id,
      productName: a.product.name,
      slug: a.product.slug,
      color: a.color,
      size: a.size,
      createdAt: a.createdAt,
      notifiedAt: a.notifiedAt,
      // Combinação que nem existe no cadastro é o achado mais valioso da lista:
      // é procura por algo que a loja não produz.
      naoCadastrada: false as boolean,
    }));
  }

  /**
   * A mesma lista, com a marca de quais combinações não existem no cadastro.
   * Fica separado da consulta acima para não fazer um SELECT por linha quando
   * a informação não for usada.
   */
  async listWithGaps() {
    const alertas = await this.list();
    const chaves = [...new Set(alertas.map((a) => `${a.productId}|${a.color}|${a.size}`))];

    const existentes = new Set<string>();
    for (const chave of chaves) {
      const [productId, color, size] = chave.split('|');
      const v = await this.prisma.productVariant.findFirst({
        where: { productId, color, size },
        select: { id: true },
      });
      if (v) existentes.add(chave);
    }

    return alertas.map((a) => ({
      ...a,
      naoCadastrada: !existentes.has(`${a.productId}|${a.color}|${a.size}`),
    }));
  }
}
