import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailFlowModule } from '../email-flow/email-flow.module';
import { ShippingModule } from '../shipping/shipping.module';
import { StockAlertsModule } from '../stock-alerts/stock-alerts.module';
import { EmailService } from './email.service';
import { EmailSchedulerService } from './email-scheduler.service';
import { EmailSchedulerController } from './email-scheduler.controller';

@Module({
  // `forwardRef` porque a dependência é circular de propósito: o módulo de
  // avisos precisa enviar e-mail, e o varredor de e-mails precisa disparar os
  // avisos. Separá-los em um terceiro módulo só para evitar o ciclo criaria uma
  // camada sem conteúdo próprio.
  imports: [
    PrismaModule,
    EmailFlowModule,
    forwardRef(() => StockAlertsModule),
    forwardRef(() => ShippingModule),
  ],
  controllers: [EmailSchedulerController],
  providers: [EmailService, EmailSchedulerService],
  exports: [EmailService],
})
export class EmailModule {}
