import { describeBlocks, summarizeDescription } from '../src/lib/description';

describe('describeBlocks', () => {
  it('separa parágrafos por linha em branco', () => {
    expect(describeBlocks('Primeiro.\n\nSegundo.')).toEqual([
      { kind: 'paragraph', text: 'Primeiro.' },
      { kind: 'paragraph', text: 'Segundo.' },
    ]);
  });

  it('junta as linhas do mesmo parágrafo', () => {
    expect(describeBlocks('uma frase\nque continua')).toEqual([
      { kind: 'paragraph', text: 'uma frase que continua' },
    ]);
  });

  it('agrupa os itens numa lista só, mesmo separados por linha em branco', () => {
    // É assim que o texto vem colado do documento de descrições.
    const blocks = describeBlocks('• Bolsos profundos\n\n• Cós alto\n\n- FPS 50+');
    expect(blocks).toEqual([
      { kind: 'list', items: ['Bolsos profundos', 'Cós alto', 'FPS 50+'] },
    ]);
  });

  it('linha curta terminada em dois-pontos vira título', () => {
    expect(describeBlocks('Ficha técnica:\n• 88% poliamida')).toEqual([
      { kind: 'heading', text: 'Ficha técnica' },
      { kind: 'list', items: ['88% poliamida'] },
    ]);
  });

  it('frase longa terminada em dois-pontos continua parágrafo', () => {
    const frase = 'O que você precisa saber antes de escolher o tamanho da peça:';
    expect(describeBlocks(frase)).toEqual([{ kind: 'paragraph', text: frase }]);
  });

  it('mantém a ordem entre parágrafo, lista e parágrafo', () => {
    const blocks = describeBlocks('Abertura.\n\n• item\n\nFechamento.');
    expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'list', 'paragraph']);
  });

  it('texto vazio não vira bloco nenhum', () => {
    expect(describeBlocks('   \n\n  ')).toEqual([]);
  });
});

describe('summarizeDescription', () => {
  it('usa o primeiro parágrafo, sem os itens da ficha', () => {
    expect(summarizeDescription('Shorts de treino.\n\n• 88% poliamida')).toBe('Shorts de treino.');
  });

  it('descrição só com itens vira uma linha, sem marcador', () => {
    expect(summarizeDescription('• um\n• dois')).toBe('um · dois');
  });

  it('corta no espaço e fecha com reticências', () => {
    const texto = `${'palavra '.repeat(40).trim()}.`;
    const resumo = summarizeDescription(texto);
    expect(resumo.length).toBeLessThanOrEqual(161);
    expect(resumo.endsWith('…')).toBe(true);
    expect(resumo).not.toContain(' …');
  });

  it('texto curto sai inteiro, sem reticências', () => {
    expect(summarizeDescription('Top de sustentação média.')).toBe('Top de sustentação média.');
  });
});
