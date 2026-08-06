import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { findImage, parseImages } from './product-images';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

@Controller('images')
export class ProductImagesController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Serve a foto do produto como arquivo. A URL contém o hash do conteúdo, então
   * pode ser cacheada para sempre: mudou a foto, muda a URL.
   */
  @Public()
  @Get(':productId/:file')
  async serve(
    @Param('productId') productId: string,
    @Param('file') file: string,
    @Res() res: Response
  ) {
    const wanted = file.replace(/\.[a-z0-9]+$/i, '').toLowerCase();

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { images: true },
    });
    const image = product ? findImage(parseImages(product.images), wanted) : null;
    if (!image) throw new NotFoundException('Imagem não encontrada');

    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Cache-Control', `public, max-age=${ONE_YEAR_SECONDS}, immutable`);
    res.setHeader('ETag', `"${wanted}"`);
    res.send(image.buffer);
  }
}
