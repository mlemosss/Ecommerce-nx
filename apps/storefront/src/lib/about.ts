/**
 * O fecho da história da marca, com tratamento tipográfico próprio.
 *
 * Fica fora de `aboutBody` porque é a assinatura, não mais um parágrafo. Mas o
 * texto salvo em Configurações termina com essas mesmas linhas — as fundadoras
 * escreveram tudo junto, e é natural que tenham colado tudo junto. Sem
 * filtrar, a página mostrava o fecho duas vezes.
 */
export const CLOSING = {
  lead: 'Não queremos apenas vestir o seu treino.',
  body: 'Queremos fazer parte daquela escolha diária de se movimentar, se cuidar, se superar e continuar.',
  signature: 'Vista sua força. Viva seu movimento.',
};

/**
 * Para comparar o que a pessoa digitou: sem caixa e sem espaço sobrando.
 *
 * Acento fica: os dois lados da comparação saem do mesmo texto, e tirar acento
 * aqui só acrescentaria uma regex difícil de ler.
 */
function normalizar(texto: string): string {
  return texto.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Tira pontuação de fim de frase, para "…treino." casar com "…treino". */
function semPontoFinal(texto: string): string {
  return texto.replace(/[.!…]+$/, '').trim();
}

/**
 * O parágrafo **é** o fecho, e não apenas menciona uma das frases.
 *
 * A primeira versão cortava qualquer parágrafo que *contivesse* "vista sua
 * força". Um parágrafo legítimo do corpo — "Vista sua força em cada treino:
 * nossas peças acompanham do aquecimento ao último exercício" — sumia da
 * página sem aviso nenhum, e do painel não havia como descobrir por quê.
 *
 * Agora compara o parágrafo inteiro com as linhas do fecho. Elas podem vir
 * juntas num parágrafo só, e a assinatura costuma vir colada no "NO EXCUSE"
 * por uma quebra de linha simples — por isso a comparação também considera o
 * parágrafo quebrado em linhas.
 */
function ehFecho(paragrafo: string): boolean {
  const linhasDoFecho = new Set(
    [
      CLOSING.lead,
      CLOSING.body,
      // As duas frases coladas numa linha só — é assim que o texto salvo em
      // Configurações traz o fecho hoje.
      `${CLOSING.lead} ${CLOSING.body}`,
      CLOSING.signature,
      'NO EXCUSE',
    ].map((l) => semPontoFinal(normalizar(l)))
  );

  const pedacos = paragrafo
    .split('\n')
    .map((linha) => semPontoFinal(normalizar(linha)))
    .filter(Boolean);

  return pedacos.length > 0 && pedacos.every((pedaco) => linhasDoFecho.has(pedaco));
}

/**
 * Quebra o texto de "Quem somos" em parágrafos, tirando o fecho.
 *
 * O que sai daqui é o corpo da história; o fecho é desenhado à parte, na seção
 * própria dele. Só os últimos parágrafos são examinados: é onde uma assinatura
 * colada de fato cai, e assim nada no meio do texto corre risco de sumir.
 */
const PARAGRAFOS_DE_FECHO = 3;

export function aboutParagraphs(body: string): string[] {
  const paragrafos = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const corte = Math.max(0, paragrafos.length - PARAGRAFOS_DE_FECHO);
  return [
    ...paragrafos.slice(0, corte),
    ...paragrafos.slice(corte).filter((p) => !ehFecho(p)),
  ];
}
