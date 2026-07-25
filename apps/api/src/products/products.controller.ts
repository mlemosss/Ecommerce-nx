import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, UpdateStockDto } from './dto/product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('category') category?: string, @Query('search') search?: string) {
    return this.productsService.findAll({ category, search });
  }

  @Get('low-stock')
  lowStock(@Query('threshold') threshold?: string) {
    return this.productsService.lowStock(threshold ? Number(threshold) : undefined);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Patch('variants/:variantId/stock')
  updateVariantStock(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateStockDto
  ) {
    return this.productsService.updateVariantStock(variantId, dto);
  }
}
