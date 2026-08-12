import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto, ValuePropDto } from './dto/settings.dto';

const SETTINGS_ID = 'singleton';

function withParsedValueProps<T extends { valueProps: string }>(
  settings: T
): Omit<T, 'valueProps'> & { valueProps: ValuePropDto[] } {
  let valueProps: ValuePropDto[];
  try {
    valueProps = JSON.parse(settings.valueProps);
  } catch {
    valueProps = [];
  }
  return { ...settings, valueProps };
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.storeSettings.findUnique({ where: { id: SETTINGS_ID } });
    const settings = existing ?? (await this.prisma.storeSettings.create({ data: { id: SETTINGS_ID } }));
    return withParsedValueProps(settings);
  }

  async update(dto: UpdateSettingsDto) {
    await this.get();
    const { valueProps, promoBannerEndsAt, ...rest } = dto;
    const updated = await this.prisma.storeSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        ...rest,
        ...(valueProps !== undefined ? { valueProps: JSON.stringify(valueProps) } : {}),
        // String vazia = tirar a data, e não gravar uma data inválida.
        ...(promoBannerEndsAt !== undefined
          ? { promoBannerEndsAt: promoBannerEndsAt ? new Date(promoBannerEndsAt) : null }
          : {}),
      },
    });
    return withParsedValueProps(updated);
  }
}
