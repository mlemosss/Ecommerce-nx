import { BadRequestException, Injectable } from '@nestjs/common';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UploadsService {
  validateProductImage(dataUrl: string): { url: string } {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
      throw new BadRequestException('Formato de imagem inválido, envie um data URL base64.');
    }

    const [, mimeType, base64Data] = match;
    if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
      throw new BadRequestException('Tipo de imagem não suportado. Use JPG, PNG ou WEBP.');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > MAX_SIZE_BYTES) {
      throw new BadRequestException('Imagem muito grande (máximo 5MB).');
    }

    return { url: dataUrl };
  }
}
