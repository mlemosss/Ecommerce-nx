import { Module } from '@nestjs/common';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';
import { MetaCapiService } from './meta-capi.service';

@Module({
  controllers: [MetaController],
  providers: [MetaService, MetaCapiService],
  exports: [MetaCapiService],
})
export class MetaModule {}
