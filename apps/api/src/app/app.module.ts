import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { CustomersModule } from '../customers/customers.module';
import { SalesModule } from '../sales/sales.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AuthModule } from '../auth/auth.module';
import { MetaModule } from '../meta/meta.module';
import { UploadsModule } from '../uploads/uploads.module';
import { CouponsModule } from '../coupons/coupons.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProductsModule,
    CustomersModule,
    SalesModule,
    ExpensesModule,
    DashboardModule,
    MetaModule,
    UploadsModule,
    CouponsModule,
    SettingsModule,
  ],
})
export class AppModule {}
