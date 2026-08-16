import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto/coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Cupom não encontrado');
    return coupon;
  }

  async create(dto: CreateCouponDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) throw new ConflictException('Já existe um cupom com esse código');

    return this.prisma.coupon.create({
      data: {
        code,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderValue: dto.minOrderValue,
        usageLimit: dto.usageLimit,
        firstPurchaseOnly: dto.firstPurchaseOnly ?? false,
        active: dto.active ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.findOne(id);

    if (dto.code) {
      const code = dto.code.trim().toUpperCase();
      const existing = await this.prisma.coupon.findUnique({ where: { code } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Já existe um cupom com esse código');
      }
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.discountType !== undefined ? { discountType: dto.discountType } : {}),
        ...(dto.discountValue !== undefined ? { discountValue: dto.discountValue } : {}),
        ...(dto.minOrderValue !== undefined ? { minOrderValue: dto.minOrderValue } : {}),
        ...(dto.usageLimit !== undefined ? { usageLimit: dto.usageLimit } : {}),
        ...(dto.firstPurchaseOnly !== undefined ? { firstPurchaseOnly: dto.firstPurchaseOnly } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.expiresAt !== undefined ? { expiresAt: new Date(dto.expiresAt) } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.coupon.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Já existe pedido no CPF informado?
   *
   * A comparação é pelo documento e não pelo e-mail: e-mail novo custa
   * segundos, e um cupom de primeira compra viraria desconto permanente para
   * quem percebesse. Guardamos o CPF só com dígitos, então a busca normaliza
   * antes de comparar.
   *
   * Sem CPF informado, não dá para afirmar que é a primeira compra. Nesse caso
   * o cupom é recusado — recusar quem não se identificou é chato; liberar para
   * quem não se identificou é o buraco inteiro.
   */
  private async jaComprou(documentNumber: string | undefined): Promise<boolean> {
    const documento = (documentNumber ?? '').replace(/\D/g, '');
    if (!documento) return true;

    const pedido = await this.prisma.order.findFirst({
      where: {
        customer: { documentNumber: documento },
        // Pedido cancelado não gasta a estreia: quem teve o boleto vencido
        // ou o cartão recusado não chegou a comprar.
        status: { notIn: ['cancelado'] },
      },
      select: { id: true },
    });
    return pedido !== null;
  }

  async validate(dto: ValidateCouponDto) {
    const code = dto.code.trim().toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });

    if (!coupon || !coupon.active) {
      return { valid: false, message: 'Cupom inválido ou inativo.' };
    }

    if (coupon.firstPurchaseOnly && (await this.jaComprou(dto.customerDocument))) {
      return {
        valid: false,
        // Mensagem igual nos dois casos — CPF sem pedido e CPF com pedido — e
        // por isso ela não diz qual dos dois é.
        //
        // A versão anterior dizia "este CPF já tem pedido na loja", e como
        // POST /coupons/validate é público isso virava um oráculo: qualquer
        // pessoa, sem token, descobria se um CPF conhecido já comprou aqui. Um
        // bit por consulta, mas é dado pessoal ligado a documento nacional, e o
        // código do cupom está impresso em toda página da loja.
        //
        // A regra não afrouxou: quem decide é POST /orders, que chama esta
        // mesma validação com o CPF do cadastro sendo criado. Ali a resposta
        // pode ser específica, porque quem pergunta é o dono do CPF.
        message: 'Este cupom vale só na primeira compra. Confira o CPF informado.',
      };
    }

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      return { valid: false, message: 'Este cupom ainda não está disponível.' };
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      return { valid: false, message: 'Este cupom expirou.' };
    }
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, message: 'Este cupom atingiu o limite de usos.' };
    }
    if (coupon.minOrderValue !== null && dto.orderTotal < coupon.minOrderValue) {
      return {
        valid: false,
        message: `Pedido mínimo de ${coupon.minOrderValue.toFixed(2)} para usar este cupom.`,
      };
    }

    const discountAmount =
      coupon.discountType === 'percentage'
        ? Math.min(dto.orderTotal, (dto.orderTotal * coupon.discountValue) / 100)
        : Math.min(dto.orderTotal, coupon.discountValue);

    return {
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
    };
  }
}
