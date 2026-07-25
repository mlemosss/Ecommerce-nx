import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.expense.findMany({ orderBy: { date: 'desc' } });
  }

  async findOne(id: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Despesa não encontrada');
    return expense;
  }

  create(dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: { ...dto, date: new Date(dto.date) },
    });
  }

  async update(id: string, dto: UpdateExpenseDto) {
    await this.findOne(id);
    return this.prisma.expense.update({
      where: { id },
      data: { ...dto, date: new Date(dto.date) },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.expense.delete({ where: { id } });
    return { success: true };
  }
}
