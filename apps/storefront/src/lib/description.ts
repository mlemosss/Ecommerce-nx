/**
 * A descrição do produto é digitada como texto puro no painel, mas na prática
 * ela tem três coisas dentro: parágrafos de venda, a ficha técnica em itens e,
 * às vezes, um título separando as duas. Renderizar tudo como parágrafo faz a
 * ficha virar um bloco corrido que ninguém lê. Aqui o texto é lido em blocos.
 */

export type DescriptionBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] };

const BULLET = /^[-•*]\s+/;

/**
 * Título só quando a linha é curta e termina em dois-pontos ("Composição:").
 * Uma frase inteira que por acaso acaba em ":" continua sendo parágrafo.
 */
function isHeading(line: string): boolean {
  return line.endsWith(':') && line.length <= 40;
}

export function describeBlocks(description: string): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  let paragraph: string[] = [];
  let items: string[] = [];

  function flushParagraph() {
    if (paragraph.length) {
      blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    }
  }

  function flushList() {
    if (items.length) {
      blocks.push({ kind: 'list', items });
      items = [];
    }
  }

  for (const raw of description.split(/\r?\n/)) {
    const line = raw.trim();

    // Linha em branco fecha o parágrafo, mas não a lista: é comum separar os
    // itens com linha em branco, e isso não deveria virar dez listas de um item.
    if (!line) {
      flushParagraph();
      continue;
    }

    if (BULLET.test(line)) {
      flushParagraph();
      const item = line.replace(BULLET, '').trim();
      if (item) items.push(item);
      continue;
    }

    flushList();

    if (isHeading(line)) {
      flushParagraph();
      blocks.push({ kind: 'heading', text: line.slice(0, -1).trim() });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

/**
 * Versão de uma linha, para a meta description e o Open Graph: o primeiro
 * parágrafo, sem os itens da ficha técnica. Colar a descrição inteira na tag
 * mandaria "• 88% poliamida" para o resultado de busca, e o Google corta em
 * ~160 caracteres de qualquer jeito.
 */
export function summarizeDescription(description: string, limit = 160): string {
  const blocks = describeBlocks(description);
  const paragraph = blocks.find((block) => block.kind === 'paragraph');
  // Descrição só com itens (acontece) vira uma linha separada por "·", em vez
  // de sair com os marcadores no meio do resultado de busca.
  const list = blocks.find((block) => block.kind === 'list');

  const raw =
    paragraph?.kind === 'paragraph'
      ? paragraph.text
      : list?.kind === 'list'
        ? list.items.join(' · ')
        : '';
  const text = raw.replace(/\s+/g, ' ').trim();

  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:—-]+$/, '')}…`;
}
