import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const products = [
  { name: 'Legging Power Compressão', category: 'leggings', price: 179.9, compareAtPrice: 219.9, colors: ['Preto', 'Grafite', 'Verde Musgo'], sizes: ['PP', 'P', 'M', 'G', 'GG'] },
  { name: 'Legging Flex Recorte', category: 'leggings', price: 169.9, colors: ['Preto', 'Marinho'], sizes: ['PP', 'P', 'M', 'G', 'GG'] },
  { name: 'Conjunto Legging + Top Cropped', category: 'leggings', price: 249.9, compareAtPrice: 289.8, colors: ['Preto', 'Verde Musgo'], sizes: ['PP', 'P', 'M', 'G', 'GG'] },
  { name: 'Top Fitness Cross', category: 'tops', price: 99.9, colors: ['Preto', 'Verde Neon', 'Rosa'], sizes: ['PP', 'P', 'M', 'G', 'GG'] },
  { name: 'Top Basic Nervura', category: 'tops', price: 79.9, colors: ['Preto', 'Branco', 'Grafite'], sizes: ['PP', 'P', 'M', 'G', 'GG'] },
  { name: 'Short Training 2 em 1', category: 'shorts', price: 129.9, colors: ['Preto', 'Chumbo'], sizes: ['PP', 'P', 'M', 'G', 'GG'] },
  { name: 'Short Run Leve', category: 'shorts', price: 109.9, colors: ['Preto', 'Azul Royal'], sizes: ['PP', 'P', 'M', 'G', 'GG'] },
  { name: 'Short-Saia Tênis', category: 'shorts', price: 139.9, colors: ['Branco', 'Preto', 'Rosa'], sizes: ['PP', 'P', 'M', 'G', 'GG'] },
  { name: 'Camiseta Dry Performance', category: 'camisetas', price: 89.9, colors: ['Preto', 'Branco', 'Verde Musgo', 'Cinza'], sizes: ['P', 'M', 'G', 'GG', 'XG'] },
  { name: 'Camiseta Oversized Treino', category: 'camisetas', price: 94.9, colors: ['Preto', 'Bege'], sizes: ['P', 'M', 'G', 'GG'] },
  { name: 'Jaqueta Corta-Vento', category: 'jaquetas', price: 249.9, compareAtPrice: 299.9, colors: ['Preto', 'Verde Musgo'], sizes: ['PP', 'P', 'M', 'G', 'GG'] },
  { name: 'Jaqueta Moletom Zíper', category: 'jaquetas', price: 219.9, colors: ['Preto', 'Cinza Mescla'], sizes: ['PP', 'P', 'M', 'G', 'GG'] },
  { name: 'Mochila Training', category: 'acessorios', price: 159.9, colors: ['Preto'], sizes: ['Único'] },
  { name: 'Garrafa Shaker 600ml', category: 'acessorios', price: 49.9, colors: ['Preto', 'Transparente', 'Verde Neon'], sizes: ['Único'] },
  { name: 'Luva de Treino Funcional', category: 'acessorios', price: 69.9, colors: ['Preto'], sizes: ['P', 'M', 'G'] },
  { name: 'Faixa de Cabelo Treino', category: 'acessorios', price: 29.9, colors: ['Preto', 'Verde Neon', 'Rosa'], sizes: ['Único'] },
];

const customers = [
  { name: 'Amanda Spina', personType: 'PF', documentNumber: '111.111.111-11', phone: '11988887777', email: 'amanda@example.com', city: 'São Paulo', state: 'SP' },
  { name: 'Ana Carolina Rezende', personType: 'PF', documentNumber: '222.222.222-22', phone: '11977776666', email: 'ana@example.com', city: 'Campinas', state: 'SP' },
  { name: 'Andreia Gomes', personType: 'PF', documentNumber: '333.333.333-33', phone: '21966665555', email: 'andreia@example.com', city: 'Rio de Janeiro', state: 'RJ' },
];

const expenses = [
  { description: 'Aluguel da loja', category: 'Fixa', amount: 2500, date: new Date('2026-07-01') },
  { description: 'Fornecedor de tecidos', category: 'Estoque', amount: 4200, date: new Date('2026-07-05') },
  { description: 'Marketing redes sociais', category: 'Marketing', amount: 800, date: new Date('2026-07-10') },
];

async function main() {
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.expense.deleteMany();

  for (const p of products) {
    await prisma.product.create({
      data: {
        name: p.name,
        slug: slugify(p.name),
        category: p.category,
        costPrice: Math.round(p.price * 0.45 * 100) / 100,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        variants: {
          create: p.colors.flatMap((color) =>
            p.sizes.map((size) => ({
              color,
              size,
              stock: Math.floor(Math.random() * 20) + 1,
            }))
          ),
        },
      },
    });
  }

  for (const c of customers) {
    await prisma.customer.create({ data: c });
  }

  for (const e of expenses) {
    await prisma.expense.create({ data: e });
  }

  console.log(`Seed concluído: ${products.length} produtos, ${customers.length} clientes, ${expenses.length} despesas.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
