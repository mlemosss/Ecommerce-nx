import { IsIn, IsString } from 'class-validator';

export class ImportDto {
  @IsIn(['csv', 'xml'])
  format!: 'csv' | 'xml';

  @IsString()
  content!: string;
}
