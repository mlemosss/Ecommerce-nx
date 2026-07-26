import { Body, Controller, Post } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadImageDto } from './dto/upload-image.dto';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('products')
  uploadProductImage(@Body() dto: UploadImageDto) {
    return this.uploadsService.validateProductImage(dto.dataUrl);
  }

  @Post('testimonials')
  uploadTestimonialPhoto(@Body() dto: UploadImageDto) {
    return this.uploadsService.validateProductImage(dto.dataUrl);
  }
}
