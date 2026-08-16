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

/**
 * O que a pessoa pode mudar sozinha na própria conta.
 *
 * E-mail fica de fora de propósito: é a identidade de login e a chave única do
 * cadastro. Trocar exige confirmar o endereço novo, senão um erro de digitação
 * tranca a conta — é uma funcionalidade à parte, não um campo a mais neste
 * formulário.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Escreva seu nome completo.' })
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;
}
