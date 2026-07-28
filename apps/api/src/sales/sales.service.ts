import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto, UpdateSaleStatusDto } from './dto/sale.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.sale.findMany({
      include: {
        customer: true,
        items: { include: { productVariant: { include: { product: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { productVariant: { include: { product: true } } } },
      },
    });
    if (!sale) throw new NotFoundException('Venda não encontrada');
    return sale;
  }

  async create(dto: CreateSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      let total = 0;
      const itemsData: { productVariantId: string; quantity: number; unitPrice: number }[] = [];

      for (const item of dto.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.productVariantId },
          include: { product: true },
        });
        if (!variant) {
          throw new BadRequestException(`Variação ${item.productVariantId} não encontrada`);
        }
        if (variant.stock < item.quantity) {
          throw new BadRequestException(
            `Estoque insuficiente para ${variant.product.name} (${variant.color}/${variant.size})`
          );
        }

        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: variant.stock - item.quantity },
        });

        const unitPrice = variant.price ?? variant.product.price;
        total += unitPrice * item.quantity;
        itemsData.push({
          productVariantId: variant.id,
          quantity: item.quantity,
          unitPrice,
        });
      }

      return tx.sale.create({
        data: {
          customerId: dto.customerId,
          paymentMethod: dto.paymentMethod,
          status: dto.status ?? 'concluida',
          installments: dto.installments ?? 1,
          total,
          items: { create: itemsData },
        },
        include: {
          customer: true,
          items: { include: { productVariant: { include: { product: true } } } },
        },
      });
    });
  }

  async updateStatus(id: string, dto: UpdateSaleStatusDto) {
    await this.findOne(id);
    return this.prisma.sale.update({
      where: { id },
      data: { status: dto.status },
      include: {
        customer: true,
        items: { include: { productVariant: { include: { product: true } } } },
      },
    });
  }
}
