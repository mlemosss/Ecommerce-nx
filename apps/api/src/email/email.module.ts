import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailFlowModule } from '../email-flow/email-flow.module';
import { EmailService } from './email.service';
import { EmailSchedulerService } from './email-scheduler.service';
import { EmailSchedulerController } from './email-scheduler.controller';

@Module({
  imports: [PrismaModule, EmailFlowModule],
  controllers: [EmailSchedulerController],
  providers: [EmailService, EmailSchedulerService],
  exports: [EmailService],
})
export class EmailModule {}
