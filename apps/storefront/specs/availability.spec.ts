import {
  availabilityOf,
  colorsFor,
  defaultSelection,
  inStockCount,
  isSoldOut,
  sizesFor,
  stockOf,
} from '../src/lib/availability';
import type { Product } from '../src/lib/types';

/**
 * Matriz esparsa igual à da Legging em produção: 6 cores × 4 tamanhos = 24
 * botões clicáveis, mas só algumas variações existem — e a primeira da ordem
 * do catálogo (Fúcsia/G) existe com estoque zero.
 */
function legging(): Product {
  return {
    id: 'p1',
    slug: 'legging',
    name: 'Legging',
    category: 'leggings',
    price: 169,
    colors: ['Fúcsia', 'Preto', 'Verde Militar'],
    sizes: ['G', 'M', 'P'],
    description: '',
    gradient: ['#000', '#111'],
    variants: [
      { color: 'Fúcsia', size: 'G', stock: 0, price: 169 },
      { color: 'Preto', size: 'M', stock: 3, price: 169 },
      { color: 'Preto', size: 'P', stock: 1, price: 169 },
      { color: 'Verde Militar', size: 'M', stock: 2, price: 169 },
    ],
  };
}

describe('availabilityOf', () => {
  it('distingue disponível, esgotado e inexistente', () => {
    const p = legging();
    expect(availabilityOf(p, 'Preto', 'M')).toBe('disponivel');
    expect(availabilityOf(p, 'Fúcsia', 'G')).toBe('esgotado');
    // Fúcsia existe, M existe — a combinação das duas, não.
    expect(availabilityOf(p, 'Fúcsia', 'M')).toBe('inexistente');
  });

  it('não se perde com diferença de caixa ou espaço', () => {
    expect(availabilityOf(legging(), ' preto ', 'm')).toBe('disponivel');
  });
});

describe('stockOf', () => {
  it('devolve o estoque da variação', () => {
    expect(stockOf(legging(), 'Preto', 'M')).toBe(3);
  });

  it('devolve zero para combinação que não existe', () => {
    expect(stockOf(legging(), 'Fúcsia', 'M')).toBe(0);
  });
});

describe('defaultSelection', () => {
  it('abre numa combinação com estoque, não na primeira da lista', () => {
    // Fúcsia/G é colors[0]+sizes[0] e tem estoque 0 — era o padrão antigo.
    expect(defaultSelection(legging())).toEqual({ color: 'Preto', size: 'M' });
  });

  it('tudo esgotado: cai na primeira variação que existe', () => {
    const p = legging();
    p.variants = p.variants!.map((v) => ({ ...v, stock: 0 }));
    expect(defaultSelection(p)).toEqual({ color: 'Fúcsia', size: 'G' });
  });

  it('produto sem variação nenhuma não quebra', () => {
    const p = legging();
    p.variants = [];
    expect(defaultSelection(p)).toEqual({ color: 'Fúcsia', size: 'G' });
  });
});

describe('sizesFor / colorsFor', () => {
  it('sem cor escolhida, lista os tamanhos que existem em alguma variação', () => {
    expect(sizesFor(legging())).toEqual(['G', 'M', 'P']);
  });

  it('com cor escolhida, filtra pelos tamanhos daquela cor', () => {
    expect(sizesFor(legging(), 'Preto')).toEqual(['M', 'P']);
    expect(sizesFor(legging(), 'Fúcsia')).toEqual(['G']);
  });

  it('com tamanho escolhido, filtra pelas cores daquele tamanho', () => {
    expect(colorsFor(legging(), 'M')).toEqual(['Preto', 'Verde Militar']);
    expect(colorsFor(legging(), 'G')).toEqual(['Fúcsia']);
  });

  it('mantém a ordem declarada no catálogo', () => {
    expect(colorsFor(legging())).toEqual(['Fúcsia', 'Preto', 'Verde Militar']);
  });
});

describe('inStockCount / isSoldOut', () => {
  it('conta só as variações com estoque', () => {
    // 4 variações, 3 com estoque — a home anunciava as 4.
    expect(inStockCount(legging())).toBe(3);
  });

  it('esgotado quando nenhuma variação tem estoque', () => {
    const p = legging();
    expect(isSoldOut(p)).toBe(false);
    p.variants = p.variants!.map((v) => ({ ...v, stock: 0 }));
    expect(isSoldOut(p)).toBe(true);
  });

  it('produto sem variação não é considerado esgotado', () => {
    const p = legging();
    p.variants = [];
    expect(isSoldOut(p)).toBe(false);
  });
});
