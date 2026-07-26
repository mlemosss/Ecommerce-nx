import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

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
