import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AsaasService } from '../asaas/asaas.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, AsaasService],
  exports: [OrdersService],
})
export class OrdersModule {}
