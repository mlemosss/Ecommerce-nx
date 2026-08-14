import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { requestContextMiddleware } from './common/request-context';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableCors();
  // Antes de tudo: guarda a URL pública desta requisição, usada para montar as
  // URLs absolutas das fotos de produto.
  app.use(requestContextMiddleware);
  // Uploads de imagem chegam como dataURL base64 no corpo JSON; o limite padrão do
  // Express (~100kb) estoura com fotos ("request entity too large" / 413). Elevado
  // para caber fotos comprimidas do celular. (bodyParser desativado no main.ts.)
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Restrição do banco vira mensagem legível em vez de "Internal server error".
  app.useGlobalFilters(new PrismaExceptionFilter(app.get(HttpAdapterHost)));
}
