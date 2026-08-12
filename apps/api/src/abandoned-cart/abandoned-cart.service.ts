import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackAbandonedCartDto } from './dto/abandoned-cart.dto';

@Injectable()
export class AbandonedCartService {
  constructor(private readonly prisma: PrismaService) {}

  async track(dto: TrackAbandonedCartDto) {
    // Sem consentimento não se guarda o e-mail. O carrinho abandonado é
    // comunicação de marketing: sem opt-in não há base legal para enviar, e
    // guardar o endereço "por via das dúvidas" é coleta sem finalidade.
    if (!dto.optIn) return { ok: true, stored: false };

    await this.prisma.abandonedCart.upsert({
      where: { email: dto.email },
      create: {
        email: dto.email,
        name: dto.name,
        itemsJson: JSON.stringify(dto.items),
        total: dto.total,
        optIn: true,
      },
      update: {
        name: dto.name,
        itemsJson: JSON.stringify(dto.items),
        total: dto.total,
        optIn: true,
        recovered: false,
        remindedAt: null,
      },
    });
    return { ok: true, stored: true };
  }

  /** Descadastro de um clique, a partir do link no rodapé do e-mail. */
  async unsubscribe(id: string) {
    // Apaga em vez de só desligar: sem consentimento, não há por que guardar.
    await this.prisma.abandonedCart.deleteMany({ where: { id } });
    return { success: true };
  }

  async markRecovered(email: string) {
    await this.prisma.abandonedCart.updateMany({
      where: { email, recovered: false },
      data: { recovered: true },
    });
  }
}
