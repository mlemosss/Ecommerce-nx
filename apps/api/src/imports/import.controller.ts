import { Body, Controller, Post } from '@nestjs/common';
import { ImportService } from './import.service';
import { ImportDto } from './dto/import.dto';

@Controller('imports')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('customers')
  importCustomers(@Body() dto: ImportDto) {
    return this.importService.importCustomers(dto.format, dto.content);
  }

  @Post('products')
  importProducts(@Body() dto: ImportDto) {
    return this.importService.importProducts(dto.format, dto.content);
  }
}
