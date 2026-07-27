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
    ]);

    const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

    const totalRevenue = sum(allSales.map((s) => s.total)) + sum(allCustomPayments.map((c) => c.amount));
    const totalExpenses = sum(allExpenses.map((e) => e.amount));
    const cashBalance = totalRevenue - totalExpenses;

    const todayIn =
      sum(allSales.filter((s) => s.createdAt >= todayStart).map((s) => s.total)) +
      sum(allCustomPayments.filter((c) => c.date >= todayStart).map((c) => c.amount));
    const todayOut = sum(allExpenses.filter((e) => e.date >= todayStart).map((e) => e.amount));

    const monthRevenue =
      sum(monthSales.map((s) => s.total)) + sum(monthCustomPayments.map((c) => c.amount));
    const monthExpensesTotal = sum(monthExpenses.map((e) => e.amount));

    const monthCogs = sum(
      monthSales.flatMap((sale) =>
        sale.items.map((item) => item.quantity * item.productVariant.product.costPrice)
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
      openAccounts: {
        count: openSales.length,
        total: sum(openSales.map((s) => s.total)),
      },
      installmentSales: {
        count: installmentSales.length,
        total: sum(installmentSales.map((s) => s.total)),
      },
    };
  }
}
