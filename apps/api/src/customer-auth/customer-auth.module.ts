import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthService } from './customer-auth.service';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService],
})
export class CustomerAuthModule {}
