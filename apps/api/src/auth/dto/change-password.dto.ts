import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  /** 8 é o mínimo aqui; o login antigo aceitava 6, o que é pouco hoje. */
  @IsString()
  @MinLength(8, { message: 'A nova senha precisa ter pelo menos 8 caracteres.' })
  newPassword!: string;
}
