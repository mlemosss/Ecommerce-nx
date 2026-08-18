import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTestimonialDto {
  @IsString()
  customerName!: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsString()
  quote!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateTestimonialDto extends CreateTestimonialDto {}

/**
 * O que a cliente manda pelo link público de avaliação da loja.
 *
 * Separado do DTO do admin de propósito. Aquele aceita `active`, `position` e
 * qualquer texto — é a lojista escrevendo. Este vem da internet aberta, então
 * não pode deixar ninguém publicar sozinho nem escolher a ordem na home.
 */
export class SubmitTestimonialDto {
  @IsString()
  @MinLength(2, { message: 'Escreva seu nome.' })
  @MaxLength(60, { message: 'Nome muito longo.' })
  customerName!: string;

  @IsString()
  @MinLength(10, { message: 'Conte um pouquinho mais — dez caracteres, pelo menos.' })
  @MaxLength(600, { message: 'Texto muito longo. Resuma em até 600 caracteres.' })
  quote!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  /**
   * Campo isca, invisível na tela.
   *
   * Robô de spam preenche todo campo que encontra; gente não vê este. Vindo
   * preenchido, a resposta é a mesma de um envio bem-sucedido — dizer "recusado"
   * ensinaria o robô a contornar.
   */
  @IsOptional()
  @IsString()
  website?: string;
}
