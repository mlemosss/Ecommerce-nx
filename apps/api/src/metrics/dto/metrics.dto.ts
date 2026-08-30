import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * O que a loja manda a cada página aberta.
 *
 * Só o caminho. Não há campo para id, sessão, referência nem qualquer coisa que
 * ligue a visita a uma pessoa — o que não existe no contrato não vaza depois.
 */
export class RegistrarVisitaDto {
  @IsString()
  @MaxLength(200)
  rota!: string;

  /** Primeira página desta aba: é o que aproxima "quantas pessoas". */
  @IsOptional()
  @IsBoolean()
  novaSessao?: boolean;

  /**
   * De onde a pessoa veio, já classificado pelo navegador.
   *
   * Só o rótulo do canal — "Meta Ads", "Instagram", "Direto". Nada que ligue a
   * visita a uma pessoa continua valendo aqui.
   */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  canal?: string;
}
