import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { AsaasService } from '../asaas/asaas.service';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthService } from './customer-auth.service';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [CustomerAuthController],
  // AsaasService nao tem modulo proprio: e provido direto, como em orders.
  providers: [CustomerAuthService, AsaasService],
})
export class CustomerAuthModule {}
