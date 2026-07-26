import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

function omitPasswordHash<T extends { passwordHash?: string | null }>(
  customer: T
): Omit<T, 'passwordHash'> & { hasAccount: boolean } {
  const { passwordHash, ...safe } = customer;
  return { ...safe, hasAccount: Boolean(passwordHash) };
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    const customers = await this.prisma.customer.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      orderBy: { name: 'asc' },
    });
    return customers.map(omitPasswordHash);
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        sales: { include: { items: true }, orderBy: { createdAt: 'desc' } },
        orders: { include: { items: true }, orderBy: { createdAt: 'desc' } },
        favorites: { include: { product: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');
    return omitPasswordHash(customer);
  }

  async create(dto: CreateCustomerDto) {
    const customer = await this.prisma.customer.create({
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
    });
    return omitPasswordHash(customer);
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
    });
    return omitPasswordHash(customer);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.customer.delete({ where: { id } });
    return { success: true };
  }
}
