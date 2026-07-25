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

export class SaleItemDto {
  @IsString()
  productVariantId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateSaleDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsIn(['pix', 'cartao', 'boleto', 'dinheiro'])
  paymentMethod!: 'pix' | 'cartao' | 'boleto' | 'dinheiro';

  @IsOptional()
  @IsIn(['concluida', 'conta_aberta'])
  status?: 'concluida' | 'conta_aberta';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];
}
