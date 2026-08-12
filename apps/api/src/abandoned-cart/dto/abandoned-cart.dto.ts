import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class AbandonedCartItemDto {
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

export class TrackAbandonedCartDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AbandonedCartItemDto)
  items!: AbandonedCartItemDto[];

  @IsNumber()
  @Min(0)
  total!: number;

  /** Só grava se o cliente marcou "quero receber um lembrete". */
  @IsOptional()
  @IsBoolean()
  optIn?: boolean;
}
