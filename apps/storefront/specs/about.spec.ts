import { aboutParagraphs } from '../src/lib/about';

/** Como o texto está salvo em Configurações hoje, com o fecho no fim. */
const TEXTO_DA_LOJISTA = [
  'A NO EXCUSE  nasceu da união de duas mulheres, duas histórias e um propósito em comum.',
  'De um lado, Isa, professora, empreendedora e apaixonada por criar.',
  'Por isso, cada peça é escolhida pensando no equilíbrio entre performance e estilo.',
  'Não queremos apenas vestir o seu treino. Queremos fazer parte daquela escolha diária de se movimentar, se cuidar, se superar e continuar.',
  'NO EXCUSE\nVista sua força. Viva seu movimento.',
].join('\n\n');

describe('aboutParagraphs', () => {
  it('tira o fecho do corpo: ele tem seção própria na página', () => {
    const p = aboutParagraphs(TEXTO_DA_LOJISTA);
    expect(p).toHaveLength(3);
    expect(p.join(' ')).not.toContain('Não queremos apenas');
    expect(p.join(' ')).not.toContain('Vista sua força');
  });

  it('não come parágrafo comum', () => {
    expect(aboutParagraphs(TEXTO_DA_LOJISTA)[0]).toContain('duas mulheres');
  });

  it('reconhece o fecho mesmo em caixa e espaçamento diferentes', () => {
    const solto = 'História.\n\nNÃO QUEREMOS APENAS   VESTIR O SEU TREINO\n\nvista sua força!';
    expect(aboutParagraphs(solto)).toEqual(['História.']);
  });

  it('texto sem o fecho passa inteiro', () => {
    expect(aboutParagraphs('Um.\n\nDois.\n\nTrês.')).toEqual(['Um.', 'Dois.', 'Três.']);
  });
});
