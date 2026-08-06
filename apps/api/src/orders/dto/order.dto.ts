import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  productId!: string;

  @IsString()
  productName!: string;

  @IsString()
  size!: string;

  @IsString()
  color!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class CreateOrderDto {
  @IsString()
  customerName!: string;

  @IsString()
  customerEmail!: string;

  @IsString()
  customerPhone!: string;

  @IsString()
  customerDocument!: string;

  @IsString()
  zipCode!: string;

  @IsString()
  city!: string;

  @IsString()
  street!: string;

  @IsString()
  number!: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsNumber()
  @Min(0)
  subtotal!: number;

  @IsNumber()
  @Min(0)
  shipping!: number;

  @IsNumber()
  @Min(0)
  discount!: number;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsNumber()
  @Min(0)
  total!: number;

  @IsIn(['pix', 'cartao', 'boleto'])
  paymentMethod!: 'pix' | 'cartao' | 'boleto';
}

/**
 * Filtros opcionais do GET /orders. Sem nenhum parâmetro a rota devolve o mesmo
 * array de sempre, então as telas antigas continuam funcionando.
 */
export class FindOrdersQueryDto {
  @IsOptional()
  @IsIn(['aguardando_pagamento', 'pago', 'enviado', 'cancelado'])
  status?: 'aguardando_pagamento' | 'pago' | 'enviado' | 'cancelado';

  /** Busca por número do pedido, nome ou e-mail do cliente. */
  @IsOptional()
  @IsString()
  q?: string;

  /** Data inicial (YYYY-MM-DD ou ISO). */
  @IsOptional()
  @IsString()
  from?: string;

  /** Data final, inclusiva quando vier só a data (YYYY-MM-DD ou ISO). */
  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class UpdateOrderStatusDto {
  @IsIn(['aguardando_pagamento', 'pago', 'enviado', 'cancelado'])
  status!: 'aguardando_pagamento' | 'pago' | 'enviado' | 'cancelado';

  @IsOptional()
  @IsString()
  trackingCode?: string;
}
