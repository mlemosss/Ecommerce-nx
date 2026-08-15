import { buildCatalogItems, toCsv, type CatalogSource } from './catalog-item';

const LOJA = 'https://www.noexcusenx.com.br';

/**
 * `images` é um JSON de strings. URL http(s) passa intacta por
 * toPublicImageUrls, então o teste não precisa carregar base64 de verdade.
 */
const FOTO = JSON.stringify([
  'https://cdn.exemplo/top-1.jpg',
  'https://cdn.exemplo/top-2.jpg',
]);

function produto(over: Partial<CatalogSource> = {}): CatalogSource {
  return {
    id: 'prod1',
    name: 'Top Energy',
    slug: 'top-energy',
    category: 'tops',
    description: 'O top de todo dia.',
    price: 109,
    compareAtPrice: null,
    images: FOTO,
    variants: [{ id: 'v1', color: 'Preto', size: 'M', stock: 4, price: null }],
    ...over,
  };
}

describe('buildCatalogItems', () => {
  it('gera um item por variação, agrupado pelo produto', () => {
    const items = buildCatalogItems(
      produto({
        variants: [
          { id: 'v1', color: 'Preto', size: 'P', stock: 2, price: null },
          { id: 'v2', color: 'Pink', size: 'M', stock: 0, price: null },
        ],
      }),
      LOJA
    );

    expect(items).toHaveLength(2);
    expect(items.map((i) => i.id)).toEqual(['v1', 'v2']);
    expect(items.every((i) => i.item_group_id === 'prod1')).toBe(true);
  });

  it('traz os campos que o Meta exige para vestuário', () => {
    const [item] = buildCatalogItems(produto(), LOJA);
    expect(item.gender).toBe('female');
    expect(item.age_group).toBe('adult');
    expect(item.google_product_category).toBe('Apparel & Accessories > Clothing > Activewear');
    expect(item.brand).toBe('NO EXCUSE');
    expect(item.condition).toBe('new');
  });

  it('estoque zero vira "out of stock"', () => {
    const [item] = buildCatalogItems(
      produto({ variants: [{ id: 'v1', color: 'Preto', size: 'M', stock: 0, price: null }] }),
      LOJA
    );
    expect(item.availability).toBe('out of stock');
    expect(item.quantity_to_sell_on_facebook).toBe('0');
  });

  it('em promoção, price é o cheio e sale_price o promocional', () => {
    const [item] = buildCatalogItems(produto({ price: 109, compareAtPrice: 139 }), LOJA);
    expect(item.price).toBe('139.00 BRL');
    expect(item.sale_price).toBe('109.00 BRL');
  });

  it('fora de promoção, sale_price fica vazio', () => {
    const [item] = buildCatalogItems(produto(), LOJA);
    expect(item.price).toBe('109.00 BRL');
    expect(item.sale_price).toBe('');
  });

  it('preço próprio da variação vale fora da promoção', () => {
    const [item] = buildCatalogItems(
      produto({ variants: [{ id: 'v1', color: 'Preto', size: 'GG', stock: 1, price: 129 }] }),
      LOJA
    );
    expect(item.price).toBe('129.00 BRL');
  });

  it('em promoção o preço promocional vale para todas as variações', () => {
    // Senão a cliente veria "-30%" e seria cobrada o preço da variação.
    const [item] = buildCatalogItems(
      produto({
        price: 109,
        compareAtPrice: 139,
        variants: [{ id: 'v1', color: 'Preto', size: 'GG', stock: 1, price: 129 }],
      }),
      LOJA
    );
    expect(item.sale_price).toBe('109.00 BRL');
  });

  it('produto sem foto não gera item nenhum', () => {
    expect(buildCatalogItems(produto({ images: '[]' }), LOJA)).toEqual([]);
  });

  it('a ficha técnica em itens vira uma linha só', () => {
    const [item] = buildCatalogItems(
      produto({ description: 'Top de treino.\n\n• FPS 50+\n\n• 88% poliamida' }),
      LOJA
    );
    expect(item.description).toBe('Top de treino. · FPS 50+ · 88% poliamida');
    expect(item.description).not.toContain('\n');
  });

  it('sem descrição, cai no nome do produto', () => {
    const [item] = buildCatalogItems(produto({ description: '' }), LOJA);
    expect(item.description).toBe('Top Energy');
  });

  it('o link aponta para a página do produto na loja', () => {
    const [item] = buildCatalogItems(produto(), LOJA);
    expect(item.link).toBe('https://www.noexcusenx.com.br/produtos/top-energy');
  });
});

describe('toCsv', () => {
  it('cabeçalho na primeira linha e uma linha por item', () => {
    const csv = toCsv(buildCatalogItems(produto(), LOJA));
    const linhas = csv.split('\r\n');
    expect(linhas[0].startsWith('id,item_group_id,title')).toBe(true);
    expect(linhas).toHaveLength(2);
  });

  it('escapa aspas e vírgulas no texto', () => {
    const csv = toCsv(buildCatalogItems(produto({ description: 'Top "firme", de treino' }), LOJA));
    expect(csv).toContain('"Top ""firme"", de treino"');
  });
});
