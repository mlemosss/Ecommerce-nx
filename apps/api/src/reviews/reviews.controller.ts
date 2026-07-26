import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { CustomerAccessible } from '../auth/customer-accessible.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/review.dto';

interface CustomerRequest {
  user: { sub: string; name: string };
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('product/:productId')
  findForProduct(@Param('productId') productId: string) {
    return this.reviewsService.findForProduct(productId);
  }

  @Get('all')
  findAll() {
    return this.reviewsService.findAll();
  }

  @CustomerAccessible()
  @Post()
  create(@Req() req: CustomerRequest, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(req.user.sub, req.user.name, dto);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body('approved') approved: boolean) {
    return this.reviewsService.setApproved(id, approved);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
