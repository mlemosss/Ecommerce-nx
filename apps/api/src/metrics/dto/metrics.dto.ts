import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

/**
 * O que a loja manda a cada página aberta.
 *
 * Só o caminho. Não há campo para id, sessão, referência nem qualquer coisa que
 * ligue a visita a uma pessoa — o que não existe no contrato não vaza depois.
 */
/** Onde a lojista gasta. Fechado: rótulo livre viraria relatório em pedaços. */
export const CANAIS_COM_GASTO = ['Meta Ads', 'Google Ads'] as const;

/** O gasto de um dia num canal. Regravar o mesmo dia substitui o valor. */
export class RegistrarGastoDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data no formato AAAA-MM-DD.' })
  dia!: string;

  @IsIn(CANAIS_COM_GASTO)
  canal!: string;

  @IsNumber()
  @Min(0)
  valor!: number;
}

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
