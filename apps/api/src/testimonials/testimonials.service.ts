import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  CreateTestimonialDto,
  SubmitTestimonialDto,
  UpdateTestimonialDto,
} from './dto/testimonial.dto';

@Injectable()
export class TestimonialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService
  ) {}

  /**
   * O que a loja mostra na home.
   *
   * Campo a campo de propósito. Devolver a linha inteira mandaria junto o
   * e-mail de quem avaliou — dado que a cliente entregou para ser respondida,
   * não para ficar aberto num endpoint público. É o tipo de vazamento que
   * ninguém percebe, porque a tela nunca desenha o campo.
   */
  findPublic() {
    return this.prisma.testimonial.findMany({
      where: { active: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        customerName: true,
        photoUrl: true,
        quote: true,
        rating: true,
        position: true,
        createdAt: true,
      },
    });
  }

  findAll() {
    return this.prisma.testimonial.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const testimonial = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!testimonial) throw new NotFoundException('Depoimento não encontrado');
    return testimonial;
  }

  create(dto: CreateTestimonialDto) {
    return this.prisma.testimonial.create({ data: dto });
  }

  /**
   * Avaliação da loja mandada pela própria cliente, pelo link público.
   *
   * Diferente da avaliação de produto, que exige o token de um pedido: esta é
   * sobre a experiência de comprar aqui — atendimento, entrega, embalagem — e
   * quem tem o que dizer sobre isso não é só quem tem um pedido aberto no
   * sistema. Por isso o link é aberto, e por isso nada entra no ar sozinho.
   *
   * `active: false` sempre. A lojista aprova em Depoimentos antes de aparecer
   * na home. É a única defesa que importa: link público sem aprovação é mural
   * de recados da internet.
   */
  async submit(dto: SubmitTestimonialDto) {
    // Campo isca preenchido: só robô faz isso. Responde como se tivesse dado
    // certo — dizer "recusado" ensinaria a contornar.
    if (dto.website?.trim()) {
      return { success: true };
    }

    // Texto com link é spam em 100% dos casos aqui: ninguém avalia legging
    // colando URL. Vale a mesma resposta silenciosa.
    if (/https?:\/\/|www\.|\.com|\.net|\.ru/i.test(dto.quote)) {
      return { success: true };
    }

    // A foto passa pelo mesmo validador da avaliação de produto: só imagem em
    // base64, dos tipos aceitos, até 5 MB. Sem isso, um POST na mão poderia
    // gravar uma URL qualquer — e ela apareceria na home depois de aprovada,
    // servindo conteúdo de outro servidor de dentro da loja.
    const photoUrl = dto.photoUrl?.trim()
      ? this.uploads.validateProductImage(dto.photoUrl.trim()).url
      : null;

    /**
     * Nome ou anonimato, um dos dois.
     *
     * Quem não quer o nome no site ainda pode avaliar — e a loja continua
     * sabendo com quem falar, porque o e-mail vem de qualquer jeito. Anônima
     * aqui quer dizer "anônima para quem visita a loja", não para a lojista;
     * sem isso, não haveria como agradecer nem como corrigir um problema.
     */
    const nome = dto.anonima ? 'Cliente NO EXCUSE' : dto.customerName?.trim();
    if (!nome || nome.length < 2) {
      throw new BadRequestException('Escreva seu nome ou marque para avaliar sem se identificar.');
    }

    await this.prisma.testimonial.create({
      data: {
        customerName: nome,
        email: dto.email.trim().toLowerCase(),
        quote: dto.quote.trim(),
        rating: dto.rating,
        photoUrl,
        active: false,
      },
    });

    return { success: true };
  }

  async update(id: string, dto: UpdateTestimonialDto) {
    await this.findOne(id);
    return this.prisma.testimonial.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.testimonial.delete({ where: { id } });
    return { success: true };
  }
}
