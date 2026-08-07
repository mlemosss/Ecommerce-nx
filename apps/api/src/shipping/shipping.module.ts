import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [SettingsModule],
  controllers: [ShippingController],
  providers: [ShippingService],
})
export class ShippingModule {}
