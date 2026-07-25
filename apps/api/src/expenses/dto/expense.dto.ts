import { IsNumber, IsString, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  description!: string;

  @IsString()
  category!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  date!: string;
}

export class UpdateExpenseDto extends CreateExpenseDto {}
