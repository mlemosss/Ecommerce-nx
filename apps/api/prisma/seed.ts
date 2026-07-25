import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@noexcuse.com.br';
const ADMIN_PASSWORD = 'NoExcuse@2026';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface VariantSeed {
  color: string;
  size: string;
  stock: number;
}

interface ProductSeed {
  name: string;
  category: string;
  price: number;
  costPrice: number;
  compareAtPrice?: number;
  variants: VariantSeed[];
}

function evenSplit(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

function crossVariants(colors: string[], sizes: string[], total: number): VariantSeed[] {
  const combos = colors.flatMap((color) => sizes.map((size) => ({ color, size })));
  const stocks = evenSplit(total, combos.length);
  return combos.map((combo, i) => ({ ...combo, stock: stocks[i] }));
}

// Produtos com valores reais (custo, preço e estoque) informados pelo lojista.
const realProducts: ProductSeed[] = [
  {
    name: 'Top Aberto',
    category: 'tops',
    price: 139.0,
    costPrice: 85.0,
    variants: crossVariants(['Marinho'], ['P', 'M', 'G'], 10),
  },
  {
    name: 'Top Básico',
    category: 'tops',
    price: 139.0,
    costPrice: 81.44,
    variants: crossVariants(['Marinho', 'Rosa', 'Verde Musgo', 'Preto'], ['P', 'M', 'G'], 24),
  },
  {
    name: 'Top Costas',
    category: 'tops',
    price: 149.0,
    costPrice: 81.44,
    variants: crossVariants(['Rosa', 'Amarelo Estampado', 'Marinho', 'Preto'], ['P', 'M', 'G'], 16),
  },
  {
    name: 'Top Regata',
    category: 'tops',
    price: 149.0,
    costPrice: 49.0,
    variants: crossVariants(['Marinho'], ['P', 'M', 'G'], 6),
  },
  {
    name: 'Top Strapy',
    category: 'tops',
    price: 149.0,
    costPrice: 85.0,
    variants: crossVariants(['Marinho'], ['P', 'M', 'G'], 11),
  },
  {
    name: 'Legging',
    category: 'leggings',
    price: 199.0,
    costPrice: 92.5,
    variants: crossVariants(['Preto', 'Bege', 'Rosa'], ['PP', 'P', 'M', 'G'], 15),
  },
  {
    name: 'Legging Estampada',
    category: 'leggings',
    price: 189.0,
    costPrice: 102.0,
    variants: [
      { color: 'Amarelo Estampado', size: 'PP', stock: 0 },
      { color: 'Amarelo Estampado', size: 'P', stock: 0 },
      { color: 'Amarelo Estampado', size: 'M', stock: 1 },
      { color: 'Amarelo Estampado', size: 'G', stock: 0 },
    ],
  },
  {
    name: 'Legging Runner',
    category: 'leggings',
    price: 209.0,
    costPrice: 97.0,
    variants: crossVariants(['Marinho'], ['P', 'M', 'G'], 9),
  },
  {
    name: 'Shorts',
    category: 'shorts',
    price: 159.0,
    costPrice: 80.5,
    variants: crossVariants(['Marinho', 'Preto', 'Rosa'], ['PP', 'P', 'M', 'G'], 25),
  },
  {
    name: 'Shorts BC',
    category: 'shorts',
    price: 159.0,
    costPrice: 87.4,
    variants: crossVariants(['Marinho'], ['PP', 'P', 'M', 'G'], 12),
  },
  {
    name: 'Shorts Runner',
    category: 'shorts',
    price: 179.0,
    costPrice: 87.4,
    variants: crossVariants(['Marinho'], ['PP', 'P', 'M', 'G'], 9),
  },
];

// Demais categorias: ainda não informadas pelo lojista, mantidas como estimativa/demonstração.
const estimatedProducts: ProductSeed[] = [
  {
    name: 'Conjunto Legging + Top Cropped',
    category: 'leggings',
    price: 249.9,
    costPrice: 112.46,
    compareAtPrice: 289.8,
    variants: crossVariants(['Preto', 'Verde Musgo'], ['PP', 'P', 'M', 'G', 'GG'], 20),
  },
  {
    name: 'Camiseta Dry Performance',
    category: 'camisetas',
    price: 89.9,
    costPrice: 40.46,
    variants: crossVariants(['Preto', 'Branco', 'Verde Musgo', 'Cinza'], ['P', 'M', 'G', 'GG'], 20),
  },
  {
    name: 'Camiseta Oversized Treino',
    category: 'camisetas',
    price: 94.9,
    costPrice: 42.71,
    variants: crossVariants(['Preto', 'Bege'], ['P', 'M', 'G', 'GG'], 12),
  },
  {
    name: 'Jaqueta Corta-Vento',
    category: 'jaquetas',
    price: 249.9,
    costPrice: 112.46,
    compareAtPrice: 299.9,
    variants: crossVariants(['Preto', 'Verde Musgo'], ['PP', 'P', 'M', 'G', 'GG'], 15),
  },
  {
    name: 'Jaqueta Moletom Zíper',
    category: 'jaquetas',
    price: 219.9,
    costPrice: 98.96,
    variants: crossVariants(['Preto', 'Cinza Mescla'], ['PP', 'P', 'M', 'G', 'GG'], 15),
  },
  {
    name: 'Mochila Training',
    category: 'acessorios',
    price: 159.9,
    costPrice: 71.96,
    variants: crossVariants(['Preto'], ['Único'], 9),
  },
  {
    name: 'Garrafa Shaker 600ml',
    category: 'acessorios',
    price: 49.9,
    costPrice: 22.46,
    variants: crossVariants(['Preto', 'Transparente', 'Verde Neon'], ['Único'], 18),
  },
  {
    name: 'Luva de Treino Funcional',
    category: 'acessorios',
    price: 69.9,
    costPrice: 31.46,
    variants: crossVariants(['Preto'], ['P', 'M', 'G'], 12),
  },
  {
    name: 'Faixa de Cabelo Treino',
    category: 'acessorios',
    price: 29.9,
    costPrice: 13.46,
    variants: crossVariants(['Preto', 'Verde Neon', 'Rosa'], ['Único'], 15),
  },
];

const products = [...realProducts, ...estimatedProducts];

const customers = [
  { name: 'Amanda Spina', personType: 'PF', documentNumber: '111.111.111-11', phone: '11988887777', email: 'amanda@example.com', city: 'São Paulo', state: 'SP' },
  { name: 'Amanda Spina Correa', personType: 'PF', documentNumber: '111.111.111-12', phone: '11988887778', email: 'amanda.correa@example.com', city: 'São Paulo', state: 'SP' },
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

  await prisma.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      name: 'Administrador',
    },
  });

  for (const p of products) {
    await prisma.product.create({
      data: {
        name: p.name,
        slug: slugify(p.name),
        category: p.category,
        costPrice: p.costPrice,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        variants: { create: p.variants },
      },
    });
  }

  const createdCustomers = [];
  for (const c of customers) {
    createdCustomers.push(await prisma.customer.create({ data: c }));
  }

  for (const e of expenses) {
    await prisma.expense.create({ data: e });
  }

  // Algumas vendas de demonstração: concluídas, em aberto (fiado) e parceladas,
  // para popular o painel financeiro e a tela de contas abertas.
  const allVariants = await prisma.productVariant.findMany({ include: { product: true } });
  const pick = (name: string) => allVariants.find((v) => v.product.name === name);

  const legging = pick('Legging');
  const topBasico = pick('Top Básico');
  const shorts = pick('Shorts');

  if (legging) {
    await prisma.sale.create({
      data: {
        customerId: createdCustomers[0].id,
        paymentMethod: 'cartao',
        status: 'concluida',
        installments: 3,
        total: legging.product.price * 1,
        items: { create: [{ productVariantId: legging.id, quantity: 1, unitPrice: legging.product.price }] },
      },
    });
  }

  if (topBasico) {
    await prisma.sale.create({
      data: {
        customerId: createdCustomers[1].id,
        paymentMethod: 'pix',
        status: 'conta_aberta',
        total: topBasico.product.price * 2,
        items: { create: [{ productVariantId: topBasico.id, quantity: 2, unitPrice: topBasico.product.price }] },
      },
    });
  }

  if (shorts) {
    await prisma.sale.create({
      data: {
        customerId: createdCustomers[2].id,
        paymentMethod: 'dinheiro',
        status: 'conta_aberta',
        total: shorts.product.price * 1,
        items: { create: [{ productVariantId: shorts.id, quantity: 1, unitPrice: shorts.product.price }] },
      },
    });
  }

  console.log(
    `Seed concluído: ${products.length} produtos, ${customers.length} clientes, ${expenses.length} despesas, 3 vendas de demonstração.`
  );
  console.log(`Login do admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
