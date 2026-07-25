import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { CustomersModule } from '../customers/customers.module';
import { SalesModule } from '../sales/sales.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [
    PrismaModule,
    ProductsModule,
    CustomersModule,
    SalesModule,
    ExpensesModule,
    DashboardModule,
  ],
})
export class AppModule {}
