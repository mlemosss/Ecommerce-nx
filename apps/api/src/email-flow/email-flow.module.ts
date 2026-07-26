import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailFlowController } from './email-flow.controller';
import { EmailFlowService } from './email-flow.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmailFlowController],
  providers: [EmailFlowService],
  exports: [EmailFlowService],
})
export class EmailFlowModule {}
