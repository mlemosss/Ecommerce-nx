import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomPaymentDto } from './dto/custom-payment.dto';

@Injectable()
export class CustomPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.customPayment.findMany({ orderBy: { date: 'desc' } });
  }

  async findOne(id: string) {
    const payment = await this.prisma.customPayment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Pagamento não encontrado');
    return payment;
  }

  create(dto: CreateCustomPaymentDto) {
    return this.prisma.customPayment.create({
      data: {
        description: dto.description,
        method: dto.method,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.customPayment.delete({ where: { id } });
    return { success: true };
  }
}
