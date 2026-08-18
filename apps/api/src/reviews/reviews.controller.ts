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

  /** As fotos aprovadas das clientes, de todas as peças, para o mural. */
  @Public()
  @Get('mural')
  mural() {
    return this.reviewsService.mural();
  }

  /**
   * Tela de avaliação por link, sem login.
   *
   * Público porque o token É a credencial: a loja é de compra sem cadastro e
   * quem comprou não tem senha. O retorno traz só o número do pedido, o
   * primeiro nome e os produtos — quem tem o link avalia, não consulta o
   * pedido.
   */
  @Public()
  @Get('link/:token')
  findByToken(@Param('token') token: string) {
    return this.reviewsService.findByToken(token);
  }

  @Public()
  @Post('link/:token')
  createFromToken(@Param('token') token: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createFromToken(token, dto);
  }

  @Get('all')
  findAll() {
    return this.reviewsService.findAll();
  }

  /** Quem já recebeu a peça e ainda não avaliou — a lista de quem pedir. */
  @Get('pendentes')
  pendingRequests() {
    return this.reviewsService.pendingRequests();
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
