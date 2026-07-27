import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackAbandonedCartDto } from './dto/abandoned-cart.dto';

@Injectable()
export class AbandonedCartService {
  constructor(private readonly prisma: PrismaService) {}

  async track(dto: TrackAbandonedCartDto) {
    await this.prisma.abandonedCart.upsert({
      where: { email: dto.email },
      create: {
        email: dto.email,
        name: dto.name,
        itemsJson: JSON.stringify(dto.items),
        total: dto.total,
      },
      update: {
        name: dto.name,
        itemsJson: JSON.stringify(dto.items),
        total: dto.total,
        recovered: false,
        remindedAt: null,
      },
    });
    return { ok: true };
  }

  async markRecovered(email: string) {
    await this.prisma.abandonedCart.updateMany({
      where: { email, recovered: false },
      data: { recovered: true },
    });
  }
}
