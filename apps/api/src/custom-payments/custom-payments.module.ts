import { Module } from '@nestjs/common';
import { CustomPaymentsController } from './custom-payments.controller';
import { CustomPaymentsService } from './custom-payments.service';

@Module({
  controllers: [CustomPaymentsController],
  providers: [CustomPaymentsService],
  exports: [CustomPaymentsService],
})
export class CustomPaymentsModule {}
