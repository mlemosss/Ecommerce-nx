import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TestimonialsController } from './testimonials.controller';
import { TestimonialsService } from './testimonials.service';

@Module({
  imports: [PrismaModule],
  controllers: [TestimonialsController],
  providers: [TestimonialsService],
})
export class TestimonialsModule {}
