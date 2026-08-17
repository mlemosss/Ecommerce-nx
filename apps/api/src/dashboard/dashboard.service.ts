import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Status de pedido do site que ja viraram dinheiro.
 *
 * Os mesmos que seguram estoque em OrdersService: pago e enviado. Cancelado
 * e aguardando pagamento nao entram no faturamento - um nao aconteceu, o
 * outro ainda nao.
 */
const PAID_ORDER_STATUSES = ['pago', 'enviado'];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = startOfMonth(now);

    const [
      allSales,
      allExpenses,
      monthSales,
      monthExpenses,
      openSales,
      installmentSales,
      allCustomPayments,
      monthCustomPayments,
      allOrders,
      monthOrders,
      openOrders,
    ] = await Promise.all([
      this.prisma.sale.findMany({ where: { status: 'concluida' } }),
      this.prisma.expense.findMany(),
      this.prisma.sale.findMany({
        where: { status: 'concluida', createdAt: { gte: monthStart } },
        include: { items: { include: { productVariant: { include: { product: true } } } } },
      }),
      this.prisma.expense.findMany({ where: { date: { gte: monthStart } } }),
      this.prisma.sale.findMany({ where: { status: 'conta_aberta' } }),
      this.prisma.sale.findMany({ where: { installments: { gt: 1 } } }),
      this.prisma.customPayment.findMany(),
      this.prisma.customPayment.findMany({ where: { date: { gte: monthStart } } }),

      // As vendas da loja online. Esta tela lia só `sale` — o balcão — e
      // `customPayment`. Todo pedido do site ficava de fora: entradas do dia,
      // faturamento do mês e saldo em caixa mostravam a loja física como se
      // fosse o negócio inteiro. É o número que ia para o Google Ads decidir
      // orçamento.
      this.prisma.order.findMany({ where: { status: { in: PAID_ORDER_STATUSES } } }),
      this.prisma.order.findMany({
        where: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: monthStart } },
        include: { items: true },
      }),
      this.prisma.order.findMany({ where: { status: 'aguardando_pagamento' } }),
    ]);

    // Custo das peças vendidas pelo site.
    //
    // O item do pedido guarda cor e tamanho como texto, não a chave da
    // variação — ele precisa sobreviver à peça ser renomeada ou apagada. Então
    // o custo é buscado depois, casando pelos três campos.
    const chavesDoMes = monthOrders.flatMap((o) =>
      o.items.map((i) => ({ productId: i.productId, color: i.color, size: i.size }))
    );
    // Mês sem venda pelo site não vai ao banco: `OR: []` é uma condição que não
    // casa com nada, e a consulta seria só ida e volta desperdiçada.
    const variantesDoMes = chavesDoMes.length
      ? await this.prisma.productVariant.findMany({
          where: { OR: chavesDoMes },
          include: { product: { select: { costPrice: true } } },
        })
      : [];
    const custoDaVariacao = new Map(
      variantesDoMes.map((v) => [
        `${v.productId}|${v.color}|${v.size}`,
        v.costPrice ?? v.product.costPrice,
      ])
    );

    const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

    const totalRevenue =
      sum(allSales.map((s) => s.total)) +
      sum(allCustomPayments.map((c) => c.amount)) +
      sum(allOrders.map((o) => o.total));
    const totalExpenses = sum(allExpenses.map((e) => e.amount));
    const cashBalance = totalRevenue - totalExpenses;

    const todayIn =
      sum(allSales.filter((s) => s.createdAt >= todayStart).map((s) => s.total)) +
      sum(allCustomPayments.filter((c) => c.date >= todayStart).map((c) => c.amount)) +
      sum(allOrders.filter((o) => o.createdAt >= todayStart).map((o) => o.total));
    const todayOut = sum(allExpenses.filter((e) => e.date >= todayStart).map((e) => e.amount));

    const monthRevenue =
      sum(monthSales.map((s) => s.total)) +
      sum(monthCustomPayments.map((c) => c.amount)) +
      sum(monthOrders.map((o) => o.total));
    const monthExpensesTotal = sum(monthExpenses.map((e) => e.amount));

    const monthCogs =
      sum(
        monthSales.flatMap((sale) =>
          sale.items.map(
            (item) =>
              item.quantity * (item.productVariant.costPrice ?? item.productVariant.product.costPrice)
          )
        )
      ) +
      sum(
        monthOrders.flatMap((order) =>
          order.items.map(
            (item) =>
              item.quantity * (custoDaVariacao.get(`${item.productId}|${item.color}|${item.size}`) ?? 0)
          )
        )
      );
    const grossProfit = monthRevenue - monthCogs;

    return {
      cashBalance,
      todayIn,
      todayOut,
      monthRevenue,
      monthExpenses: monthExpensesTotal,
      grossProfit,
      // "Conta aberta" do balcão e pedido do site esperando pagamento são a
      // mesma coisa para quem olha o caixa: dinheiro prometido que ainda não
      // entrou. Somados, param de contar meia história.
      openAccounts: {
        count: openSales.length + openOrders.length,
        total: sum(openSales.map((s) => s.total)) + sum(openOrders.map((o) => o.total)),
      },
      installmentSales: {
        count: installmentSales.length,
        total: sum(installmentSales.map((s) => s.total)),
      },
      /** Só a loja online, para dar para separar de onde veio a venda. */
      onlineStore: {
        monthCount: monthOrders.length,
        monthRevenue: sum(monthOrders.map((o) => o.total)),
      },
    };
  }
}
