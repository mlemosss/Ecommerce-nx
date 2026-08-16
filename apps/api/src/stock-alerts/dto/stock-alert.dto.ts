import { IsEmail, IsString, MaxLength } from 'class-validator';

export class CreateStockAlertDto {
  @IsString()
  productId!: string;

  @IsString()
  @MaxLength(60)
  color!: string;

  @IsString()
  @MaxLength(20)
  size!: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(200)
  email!: string;
}
