import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ReviewImagesController } from './review-images.controller';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [ReviewsController, ReviewImagesController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
