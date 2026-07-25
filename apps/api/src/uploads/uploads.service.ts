import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const ALLOWED_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UploadsService {
  private readonly uploadsDir = join(process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads'), 'products');

  saveProductImage(dataUrl: string): { url: string } {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
      throw new BadRequestException('Formato de imagem inválido, envie um data URL base64.');
    }

    const [, mimeType, base64Data] = match;
    const extension = ALLOWED_EXTENSIONS[mimeType.toLowerCase()];
    if (!extension) {
      throw new BadRequestException('Tipo de imagem não suportado. Use JPG, PNG ou WEBP.');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > MAX_SIZE_BYTES) {
      throw new BadRequestException('Imagem muito grande (máximo 5MB).');
    }

    mkdirSync(this.uploadsDir, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    writeFileSync(join(this.uploadsDir, filename), buffer);

    return { url: `/uploads/products/${filename}` };
  }
}
