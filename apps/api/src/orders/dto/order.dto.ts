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

/**
 * Dados do cartão no checkout transparente.
 *
 * Trafegam por HTTPS, são repassados ao Asaas na mesma requisição e **nunca são
 * gravados nem registrados em log**. Nenhum campo daqui vai para o banco.
 */
export class CreditCardDto {
  @IsString()
  holderName!: string;

  @IsString()
  number!: string;

  @IsString()
  expiryMonth!: string;

  @IsString()
  expiryYear!: string;

  @IsString()
  ccv!: string;
}

export class CreateOrderDto {
  /**
   * Identificadores de clique da Meta, lidos dos cookies pelo navegador.
   *
   * Vem no corpo porque a loja e a API estao em dominios diferentes: cookie
   * de primeira parte da loja nao viaja ate aqui sozinho.
   */
  @IsOptional()
  @IsString()
  metaFbp?: string;

  @IsOptional()
  @IsString()
  metaFbc?: string;

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

  /** Só no cartão: quando vem, a cobrança é feita sem sair da loja. */
  @IsOptional()
  @ValidateNested()
  @Type(() => CreditCardDto)
  creditCard?: CreditCardDto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  installmentCount?: number;
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
