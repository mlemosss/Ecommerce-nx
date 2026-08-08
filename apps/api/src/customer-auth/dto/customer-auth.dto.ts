import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterCustomerDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginCustomerDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class SetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8, { message: 'A senha precisa ter pelo menos 8 caracteres.' })
  password!: string;
}

export class ToggleFavoriteDto {
  @IsString()
  productId!: string;
}
