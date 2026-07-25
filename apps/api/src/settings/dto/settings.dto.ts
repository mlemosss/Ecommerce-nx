import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  storeName?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactWhatsapp?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeShippingThreshold?: number;

  @IsOptional()
  @IsBoolean()
  pixEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  cardEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  boletoEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxInstallments?: number;

  @IsOptional()
  @IsString()
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  facebookUrl?: string;
}
