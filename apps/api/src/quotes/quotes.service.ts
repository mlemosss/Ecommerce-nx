import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto, UpdateQuoteStatusDto } from './dto/quote.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.quote.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id }, include: { items: true } });
    if (!quote) throw new NotFoundException('Orçamento não encontrado');
    return quote;
  }

  create(dto: CreateQuoteDto) {
    const total = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    return this.prisma.quote.create({
      data: {
        customerName: dto.customerName,
        notes: dto.notes,
        total,
        items: {
          create: dto.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
  }

  async updateStatus(id: string, dto: UpdateQuoteStatusDto) {
    await this.findOne(id);
    return this.prisma.quote.update({
      where: { id },
      data: { status: dto.status },
      include: { items: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.quote.delete({ where: { id } });
    return { success: true };
  }
}
