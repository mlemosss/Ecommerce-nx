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
import { OrdersModule } from '../orders/orders.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ImportModule } from '../imports/import.module';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { TestimonialsModule } from '../testimonials/testimonials.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { ShopeeModule } from '../shopee/shopee.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { EmailFlowModule } from '../email-flow/email-flow.module';
import { EmailModule } from '../email/email.module';
import { AbandonedCartModule } from '../abandoned-cart/abandoned-cart.module';
import { CustomPaymentsModule } from '../custom-payments/custom-payments.module';
import { QuotesModule } from '../quotes/quotes.module';
import { ShippingModule } from '../shipping/shipping.module';
import { StockAlertsModule } from '../stock-alerts/stock-alerts.module';

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
    OrdersModule,
    WebhooksModule,
    ImportModule,
    CustomerAuthModule,
    CatalogModule,
    TestimonialsModule,
    ReviewsModule,
    ShopeeModule,
    IntegrationsModule,
    EmailFlowModule,
    EmailModule,
    AbandonedCartModule,
    CustomPaymentsModule,
    QuotesModule,
    ShippingModule,
    StockAlertsModule,
  ],
})
export class AppModule {}
