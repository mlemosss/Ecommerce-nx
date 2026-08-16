import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MinLength(3)
  comment!: string;

  /**
   * Foto de quem usou a peça, opcional, como dataURL.
   *
   * Chega no mesmo formato da foto de produto e passa pela mesma validação de
   * tipo e tamanho (`UploadsService`) antes de ser gravada — sem isso, um
   * endpoint público que aceita string arbitrária vira depósito de qualquer
   * coisa.
   */
  @IsOptional()
  @IsString()
  photoUrl?: string;
}
