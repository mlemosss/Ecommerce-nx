import { INestApplication, ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableCors();
  // Uploads de imagem chegam como dataURL base64 no corpo JSON; o limite padrão do
  // Express (~100kb) estoura com fotos ("request entity too large" / 413). Elevado
  // para caber fotos comprimidas do celular. (bodyParser desativado no main.ts.)
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}
