import { ImportService } from './import.service';

/**
 * Importar a lista de precos do fornecedor zerava o estoque da loja inteira.
 *
 * A coluna `stock` nao existe numa planilha de precos, e `Number('')` em
 * JavaScript e 0 - nao NaN. O `upsert` levava esse zero no `update`, entao
 * toda variacao citada no arquivo ia a saldo zero. Sem transacao envolvendo o
 * laco, sem valor anterior guardado e sem tabela de movimentacao em lugar
 * nenhum do schema: perda irreversivel, numa loja de producao.
 *
 * A regra agora e a mesma de `compareAtPrice`: campo informado vale, campo
 * ausente nao mexe no que esta no banco.
 */
function montar(variacaoExistente = true) {
  const upsert = jest.fn(async () => ({}));
  const prisma = {
    product: {
      findFirst: jest.fn(async () => (variacaoExistente ? { id: 'prod-1', name: 'Top Alpha' } : null)),
      findUnique: jest.fn(async () => null),
      create: jest.fn(async () => ({ id: 'prod-1', name: 'Top Alpha' })),
      update: jest.fn(async () => ({})),
    },
    productVariant: { upsert },
  };

  return { service: new ImportService(prisma as never), upsert, prisma };
}

/** O que o `upsert` pediu para gravar numa variacao que ja existe. */
function updateDoUpsert(upsert: jest.Mock) {
  return upsert.mock.calls[0][0].update;
}

describe('importProducts — estoque', () => {
  it('nao mexe no estoque quando o arquivo nao tem a coluna', async () => {
    const t = montar();
    const csv = 'name,category,color,size,price,costPrice\nTop Alpha,tops,Preto,M,129.9,40\n';

    const r = await t.service.importProducts('csv', csv);

    expect(r.errors).toEqual([]);
    // Nao basta nao ser zero: `stock` nao pode aparecer no update.
    expect(updateDoUpsert(t.upsert)).not.toHaveProperty('stock');
  });

  it('nao mexe no estoque quando a celula esta vazia', async () => {
    const t = montar();
    const csv = 'name,category,color,size,price,costPrice,stock\nTop Alpha,tops,Preto,M,129.9,40,\n';

    const r = await t.service.importProducts('csv', csv);

    expect(r.errors).toEqual([]);
    expect(updateDoUpsert(t.upsert)).not.toHaveProperty('stock');
  });

  it('zera o estoque quando o arquivo diz zero de proposito', async () => {
    const t = montar();
    const csv = 'name,category,color,size,price,costPrice,stock\nTop Alpha,tops,Preto,M,129.9,40,0\n';

    await t.service.importProducts('csv', csv);

    expect(updateDoUpsert(t.upsert)).toEqual({ stock: 0 });
  });

  it('grava o estoque informado', async () => {
    const t = montar();
    const csv = 'name,category,color,size,price,costPrice,stock\nTop Alpha,tops,Preto,M,129.9,40,7\n';

    await t.service.importProducts('csv', csv);

    expect(updateDoUpsert(t.upsert)).toEqual({ stock: 7 });
  });

  it('variacao nova sem coluna de estoque nasce com zero', async () => {
    const t = montar(false);
    const csv = 'name,category,color,size,price,costPrice\nTop Alpha,tops,Preto,M,129.9,40\n';

    await t.service.importProducts('csv', csv);

    expect(t.upsert.mock.calls[0][0].create).toMatchObject({ stock: 0 });
  });

  it('recusa a linha com estoque ilegivel em vez de zerar', async () => {
    const t = montar();
    const csv = 'name,category,color,size,price,costPrice,stock\nTop Alpha,tops,Preto,M,129.9,40,esgotado\n';

    const r = await t.service.importProducts('csv', csv);

    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].message).toMatch(/[Ee]stoque inv/);
    // O ponto todo: linha recusada nao grava nada.
    expect(t.upsert).not.toHaveBeenCalled();
  });

  it('recusa estoque negativo', async () => {
    const t = montar();
    const csv = 'name,category,color,size,price,costPrice,stock\nTop Alpha,tops,Preto,M,129.9,40,-3\n';

    const r = await t.service.importProducts('csv', csv);

    expect(r.errors).toHaveLength(1);
    expect(t.upsert).not.toHaveBeenCalled();
  });
});
