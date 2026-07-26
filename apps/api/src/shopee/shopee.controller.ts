import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { ShopeeService } from './shopee.service';

@Controller('shopee')
export class ShopeeController {
  constructor(private readonly shopeeService: ShopeeService) {}

  @Get('status')
  status() {
    return this.shopeeService.status();
  }

  @Get('authorize-url')
  getAuthorizeUrl() {
    return this.shopeeService.getAuthorizeUrl();
  }

  @Public()
  @Get('callback')
  async callback(@Query('code') code: string, @Query('shop_id') shopId: string, @Res() res: Response) {
    const adminUrl = (process.env.ADMIN_PUBLIC_URL || 'http://localhost:4200/admin').replace(/\/$/, '');
    try {
      await this.shopeeService.handleCallback(code, shopId);
      res.redirect(`${adminUrl}/shopee?connected=1`);
    } catch {
      res.redirect(`${adminUrl}/shopee?connected=0`);
    }
  }

  @Get('categories')
  listCategories() {
    return this.shopeeService.listCategories();
  }

  @Post('categories/default')
  setDefaultCategory(@Body('categoryId') categoryId: number) {
    return this.shopeeService.setDefaultCategory(categoryId);
  }

  @Post('sync')
  sync() {
    return this.shopeeService.syncProducts();
  }
}
