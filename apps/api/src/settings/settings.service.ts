import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/settings.dto';

const SETTINGS_ID = 'singleton';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.storeSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (existing) return existing;
    return this.prisma.storeSettings.create({ data: { id: SETTINGS_ID } });
  }

  async update(dto: UpdateSettingsDto) {
    await this.get();
    return this.prisma.storeSettings.update({
      where: { id: SETTINGS_ID },
      data: dto,
    });
  }
}
