import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AsaasService } from '../asaas/asaas.service';
import { CouponsModule } from '../coupons/coupons.module';
import { SettingsModule } from '../settings/settings.module';
import { ShippingModule } from '../shipping/shipping.module';
import { EmailModule } from '../email/email.module';
import { AbandonedCartModule } from '../abandoned-cart/abandoned-cart.module';

@Module({
  imports: [CouponsModule, SettingsModule, ShippingModule, EmailModule, AbandonedCartModule],
  controllers: [OrdersController],
  providers: [OrdersService, AsaasService],
  exports: [OrdersService],
})
export class OrdersModule {}
