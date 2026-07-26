import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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
