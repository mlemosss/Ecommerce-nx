import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTestimonialDto,
  SubmitTestimonialDto,
  UpdateTestimonialDto,
} from './dto/testimonial.dto';

@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService) {}

  findPublic() {
    return this.prisma.testimonial.findMany({
      where: { active: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
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

    await this.prisma.testimonial.create({
      data: {
        customerName: dto.customerName.trim(),
        quote: dto.quote.trim(),
        rating: dto.rating,
        photoUrl: dto.photoUrl?.trim() || null,
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
