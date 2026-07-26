import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { TestimonialsService } from './testimonials.service';
import { CreateTestimonialDto, UpdateTestimonialDto } from './dto/testimonial.dto';

@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Public()
  @Get()
  findPublic() {
    return this.testimonialsService.findPublic();
  }

  @Get('all')
  findAll() {
    return this.testimonialsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.testimonialsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTestimonialDto) {
    return this.testimonialsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) {
    return this.testimonialsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.testimonialsService.remove(id);
  }
}
