import { Controller, Get, Param, Post } from '@nestjs/common';
import { MetaService } from './meta.service';

@Controller('meta')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  @Get('status')
  status() {
    return this.metaService.status();
  }

  @Post('sync')
  sync() {
    return this.metaService.syncProducts();
  }

  @Get('batch-status/:handle')
  batchStatus(@Param('handle') handle: string) {
    return this.metaService.batchStatus(handle);
  }
}
