import {
  availabilityOf,
  colorsFor,
  colorsForDisplay,
  defaultSelection,
  inStockCount,
  isSoldOut,
  sizesFor,
  stockOf,
  stockWarning,
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

describe('sizesFor', () => {
  it('mostra a grade inteira, mesmo o que a loja não fabrica', () => {
    // A Legging não tem nenhuma variação GG. Ele aparece assim mesmo, riscado,
    // porque é clicando nele que a cliente informa que existe procura — o dado
    // que decide o que mandar produzir.
    expect(sizesFor(legging())).toEqual(['PP', 'P', 'M', 'G', 'GG']);
  });

  it('a grade não encolhe ao trocar de cor', () => {
    // Antes ela filtrava pela cor e os botões sumiam debaixo do dedo.
    expect(sizesFor(legging(), 'Fúcsia')).toEqual(sizesFor(legging(), 'Preto'));
  });

  it('tamanho fora da grade padrão é acrescentado no fim', () => {
    const p = legging();
    p.sizes = ['P', 'Único'];
    expect(sizesFor(p)).toEqual(['PP', 'P', 'M', 'G', 'GG', 'Único']);
  });

  it('top não mostra PP: a loja não faz essa numeração em top', () => {
    // Só legging e shorts saem em PP. Riscar o PP no top pedia aviso de um
    // tamanho que nunca vai chegar, e enchia a lista de produção da lojista
    // com algo que ela já sabe que não fabrica.
    const top = { ...legging(), category: 'tops' as const, sizes: ['P', 'M'], variants: [] };
    expect(sizesFor(top)).toEqual(['P', 'M', 'G', 'GG']);
  });

  it('mas um top que de fato tenha PP continua aparecendo, na posição certa', () => {
    const top: Product = {
      ...legging(),
      category: 'tops',
      sizes: ['PP', 'M'],
      variants: [{ color: 'Preto', size: 'PP', stock: 2, price: 129 }],
    };
    expect(sizesFor(top)).toEqual(['PP', 'P', 'M', 'G', 'GG']);
  });

  it('top com variação PP zerada não mostra PP', () => {
    // "Não fazemos esse tamanho" costuma estar cadastrado como variação com
    // estoque zero — e `sizes` do catálogo é derivado das variações sem olhar
    // estoque. Sem filtrar, a exceção engolia a regra.
    const top: Product = {
      ...legging(),
      category: 'tops',
      sizes: ['PP', 'M'],
      variants: [
        { color: 'Preto', size: 'PP', stock: 0, price: 129 },
        { color: 'Preto', size: 'M', stock: 4, price: 129 },
      ],
    };
    expect(sizesFor(top)).toEqual(['P', 'M', 'G', 'GG']);
  });
});

describe('colorsFor', () => {
  it('com tamanho escolhido, filtra pelas cores daquele tamanho', () => {
    expect(colorsFor(legging(), 'M')).toEqual(['Preto', 'Verde Militar']);
    expect(colorsFor(legging(), 'G')).toEqual(['Fúcsia']);
  });

  it('mantém a ordem declarada no catálogo', () => {
    expect(colorsFor(legging())).toEqual(['Fúcsia', 'Preto', 'Verde Militar']);
  });
});

describe('colorsForDisplay', () => {
  it('mostra todas as cores declaradas, com estoque ou sem', () => {
    expect(colorsForDisplay(legging())).toEqual(['Fúcsia', 'Preto', 'Verde Militar']);
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

describe('stockWarning', () => {
  function comEstoque(...quantidades: number[]): Product {
    return {
      ...legging(),
      variants: quantidades.map((stock, i) => ({
        id: `v${i}`,
        color: `Cor ${i}`,
        size: 'M',
        stock,
        price: 169,
      })),
    };
  }

  it('conta peças, não combinações', () => {
    // Três variações com 1 peça cada são 3 peças, não 3 avisos diferentes.
    expect(stockWarning(comEstoque(1, 1, 1))).toBe('Últimas 3');
  });

  it('uma peça só tem nome próprio', () => {
    expect(stockWarning(comEstoque(1))).toBe('Última peça');
    expect(stockWarning(comEstoque(1, 0, 0))).toBe('Última peça');
  });

  it('cala a boca quando há estoque de sobra', () => {
    // Aviso que aparece em tudo vira enfeite: a cliente aprende a ignorar.
    expect(stockWarning(comEstoque(6))).toBeNull();
    expect(stockWarning(comEstoque(3, 3, 3))).toBeNull();
  });

  it('peça esgotada não recebe aviso de pressa', () => {
    // Ali o card não precisa de urgência, precisa do "avise-me" lá dentro.
    expect(stockWarning(comEstoque(0, 0))).toBeNull();
  });
});
