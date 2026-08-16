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

/**
 * Trechos que identificam o fecho.
 *
 * Comparação por conteúdo, e não por igualdade exata: as duas frases podem vir
 * no mesmo parágrafo, com ou sem ponto final, e a assinatura costuma vir colada
 * no "NO EXCUSE" por uma quebra de linha só.
 */
const MARCAS_DO_FECHO = ['não queremos apenas vestir o seu treino', 'vista sua força'];

function ehFecho(paragrafo: string): boolean {
  const t = normalizar(paragrafo);
  return t === 'no excuse' || MARCAS_DO_FECHO.some((marca) => t.includes(marca));
}

/**
 * Quebra o texto de "Quem somos" em parágrafos, tirando o fecho.
 *
 * O que sai daqui é o corpo da história; o fecho é desenhado à parte, na seção
 * própria dele.
 */
export function aboutParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !ehFecho(p));
}
