import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

const UM_DIA_EM_SEGUNDOS = 60 * 60 * 24;

const DATA_URL = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

/**
 * Serve a foto da cliente como arquivo, em vez de embutida na página.
 *
 * As fotos de avaliação são gravadas como dataURL em base64, e eram cuspidas
 * direto no `src` da imagem. O resultado: a home da loja saía com **4,7 MB de
 * HTML**, cada página de produto com 2,9 MB, e a de avaliações com 3,9 MB — as
 * mesmas fotos ainda repetidas no payload do React, contando duas vezes.
 *
 * Isso não é peso: é a página não abrir. Quem chega de anúncio no 4G desiste
 * antes de a primeira foto aparecer, e a loja está prestes a pagar por esses
 * cliques.
 *
 * As fotos de produto já tinham sido resolvidas assim (`product-images`); as de
 * cliente ficaram para trás. Serve também para o banco: a listagem para de
 * arrastar megabytes de base64 para fora do Postgres a cada visita, que é a
 * mesma conta que derrubou a loja em 18/08.
 *
 * Cache de um dia, e não "imutável" como o das fotos de produto: a URL destas
 * não carrega o hash do conteúdo, e a cliente pode trocar a foto pelo link de
 * avaliação antes da aprovação. Um dia guardado resolve o peso; eterno
 * guardaria a foto errada.
 */
@Controller('review-images')
export class ReviewImagesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(':tipo/:file')
  async serve(@Param('tipo') tipo: string, @Param('file') file: string, @Res() res: Response) {
    const id = file.replace(/\.[a-z0-9]+$/i, '');

    const guardada =
      tipo === 'depoimento'
        ? await this.prisma.testimonial.findUnique({
            where: { id },
            select: { photoUrl: true, active: true },
          })
        : await this.prisma.productReview.findUnique({
            where: { id },
            select: { photoUrl: true, approved: true },
          });

    // Só o que já está no ar. Sem isto, quem adivinhasse um id veria foto de
    // avaliação ainda não aprovada — que é conteúdo que a lojista escolheu não
    // publicar, às vezes justamente por ser impróprio.
    const publicada =
      guardada && ('active' in guardada ? guardada.active : guardada.approved);
    if (!guardada || !publicada || !guardada.photoUrl) {
      throw new NotFoundException('Imagem não encontrada');
    }

    const match = DATA_URL.exec(guardada.photoUrl);
    if (!match) throw new NotFoundException('Imagem não encontrada');

    res.setHeader('Content-Type', match[1]);
    res.setHeader('Cache-Control', `public, max-age=${UM_DIA_EM_SEGUNDOS}`);
    res.send(Buffer.from(match[2], 'base64'));
  }
}
