import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';

/**
 * Erro do banco vira mensagem, não "Internal server error".
 *
 * Sem isto, qualquer restrição do Postgres chega ao painel como 500 sem texto:
 * quem está usando não sabe se errou o formulário, se a loja caiu ou se deve
 * tentar de novo — e o motivo real só aparece no log da Vercel. Cada código
 * conhecido do Prisma vira aqui um status e uma frase em português.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Prisma');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    // O texto cru do Prisma continua no log: a mensagem amigável é para a tela.
    this.logger.error(`${exception.code}: ${exception.message}`);

    const http = this.translate(exception);
    const { httpAdapter } = this.httpAdapterHost;
    const response = host.switchToHttp().getResponse();

    httpAdapter.reply(response, http.getResponse(), http.getStatus());
  }

  private translate(exception: Prisma.PrismaClientKnownRequestError): HttpException {
    const target = Array.isArray(exception.meta?.['target'])
      ? (exception.meta['target'] as string[]).join(', ')
      : undefined;

    switch (exception.code) {
      case 'P2002':
        return new ConflictException(
          target
            ? `Já existe um registro com este valor em: ${target}.`
            : 'Já existe um registro com este valor.'
        );
      case 'P2003':
        return new ConflictException(
          'Este registro está ligado a outro (venda, pedido ou movimentação) e não pode ser ' +
            'apagado. Desative-o ou zere o estoque em vez de excluir.'
        );
      case 'P2025':
        return new NotFoundException('Registro não encontrado.');
      default:
        // Timeout de conexão e afins: continua sendo 500, porque aí o problema
        // é do servidor e tentar de novo faz sentido.
        return new InternalServerErrorException(
          `Erro ao falar com o banco de dados (${exception.code}). Tente de novo em instantes.`
        );
    }
  }
}
