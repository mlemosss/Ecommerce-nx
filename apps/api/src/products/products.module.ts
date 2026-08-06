import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductImagesController } from './product-images.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController, ProductImagesController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
