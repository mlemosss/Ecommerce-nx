import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { EtiquetaService } from './etiqueta.service';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [SettingsModule, PrismaModule],
  controllers: [ShippingController],
  providers: [ShippingService, EtiquetaService],
  exports: [ShippingService, EtiquetaService],
})
export class ShippingModule {}
