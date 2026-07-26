import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopeeController } from './shopee.controller';
import { ShopeeService } from './shopee.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShopeeController],
  providers: [ShopeeService],
})
export class ShopeeModule {}
