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
    const solto = [
      'História.',
      'NÃO QUEREMOS APENAS   VESTIR O SEU TREINO.',
      'VISTA SUA FORÇA. VIVA SEU MOVIMENTO!',
    ].join('\n\n');
    expect(aboutParagraphs(solto)).toEqual(['História.']);
  });

  // Frase pela metade não é o fecho: é uma frase que a lojista escreveu. Este
  // teste antes esperava que ela sumisse — era o comportamento agressivo que
  // engolia parágrafo legítimo, e sumir sem aviso é o pior desfecho.
  it('meia assinatura fica: não é o fecho, é texto dela', () => {
    const texto = 'História.\n\nVista sua força!';
    expect(aboutParagraphs(texto)).toEqual(['História.', 'Vista sua força!']);
  });

  it('texto sem o fecho passa inteiro', () => {
    expect(aboutParagraphs('Um.\n\nDois.\n\nTrês.')).toEqual(['Um.', 'Dois.', 'Três.']);
  });

  // A primeira versão cortava qualquer parágrafo que *contivesse* a frase. Um
  // parágrafo legítimo do corpo sumia da página, e do painel não havia como
  // descobrir por quê.
  it('não apaga parágrafo do corpo que só menciona a frase', () => {
    const texto = [
      'A marca nasceu de duas histórias.',
      'Vista sua força em cada treino: nossas peças acompanham do aquecimento ao último exercício.',
      'Não queremos apenas vestir o seu treino. Queremos fazer parte daquela escolha diária de se movimentar, se cuidar, se superar e continuar.',
    ].join('\n\n');

    const p = aboutParagraphs(texto);
    expect(p).toHaveLength(2);
    expect(p[1]).toContain('em cada treino');
  });

  // O filtro só olha o fim do texto: nada no meio da história corre risco.
  it('não mexe em parágrafo longe do fim, mesmo idêntico ao fecho', () => {
    const texto = [
      'Vista sua força. Viva seu movimento.',
      'Um.',
      'Dois.',
      'Três.',
      'Quatro.',
    ].join('\n\n');

    expect(aboutParagraphs(texto)[0]).toBe('Vista sua força. Viva seu movimento.');
  });
});
