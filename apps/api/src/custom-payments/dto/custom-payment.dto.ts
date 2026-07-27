import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCustomPaymentDto {
  @IsString()
  description!: string;

  @IsIn(['pix', 'cartao', 'boleto', 'dinheiro'])
  method!: 'pix' | 'cartao' | 'boleto' | 'dinheiro';

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  date?: string;
}
