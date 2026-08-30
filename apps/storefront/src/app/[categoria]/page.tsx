import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categories, getProducts } from '../../lib/products';
import type { Category } from '../../lib/types';
import { ProductsPageClient } from '../produtos/products-page-client';
import { JsonLd } from '../../components/json-ld';
import { breadcrumbSchema, faqSchema, itemListSchema } from '../../lib/structured-data';

const STOREFRONT_URL = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://www.noexcusenx.com.br'
).replace(/\/$/, '');

/**
 * Categoria com endereço próprio: /leggings, /tops, /shorts.
 *
 * Existiam só como filtro — `/produtos?categoria=leggings` —, e `/leggings`
 * dava 404. Isso custa de três formas: quem digita o endereço direto não
 * chega, o anúncio do Google Ads leva à vitrine inteira em vez da prateleira
 * certa (e Índice de Qualidade cai quando a página de destino não fala do que
 * o anúncio prometeu), e o link compartilhado no Instagram perde o assunto.
 *
 * `dynamicParams = false` com a lista fixa: só estas três existem, e qualquer
 * outro endereço continua sendo 404 de verdade, resolvido pelo roteador antes
 * de chegar aqui. Sem isso, esta rota viraria o coringa de tudo que não casa
 * com outra página.
 *
 * O conteúdo é o mesmo de `/produtos` filtrado, e `/produtos?categoria=x`
 * agora redireciona para cá: duas URLs com a mesma lista dividiriam o
 * ranqueamento entre si em vez de somar.
 */

const CATEGORIAS_COM_PAGINA = ['leggings', 'tops', 'shorts'] as const;

/**
 * O texto que faz a prateleira existir para o buscador.
 *
 * As páginas de categoria eram um título e uma frase sobre uma grade de dois
 * produtos. Isso não ranqueia para "legging fitness feminina" contra marca
 * grande — e é a página para onde o anúncio aponta.
 *
 * Vai **abaixo** da grade, de propósito: quem chegou quer ver as peças, e
 * empurrar produto para baixo com parágrafo é trocar conversão por SEO. Aqui
 * as duas coisas cabem, em ordem.
 *
 * O conteúdo sai do que a loja já sabe — as descrições das peças e a FAQ.
 * Nenhuma afirmação nova sobre tecido ou caimento foi inventada aqui.
 */
const TEXTO: Record<string, { titulo: string; paragrafos: string[] }[]> = {
  leggings: [
    {
      titulo: 'Compressão: média ou alta?',
      paragrafos: [
        'Compressão média é a do dia a dia — musculação, funcional, caminhada. Ela segura sem apertar e não marca depois de uma hora sentada. É a da Legging Energy.',
        'Compressão alta segura mais o músculo e é a escolha de quem corre ou faz treino de impacto. É a da Legging Runner, que tem ainda bolso lateral para o celular e proteção solar FPS 50+.',
      ],
    },
    {
      titulo: 'Cós alto: o que muda no agachamento',
      paragrafos: [
        'Cós baixo desce no agachamento profundo, e a pessoa passa o treino puxando a peça para cima. As nossas leggings têm cós bem alto e firme, que fica onde foi colocado.',
        'O cós alto também é o que dá a sustentação na cintura sem precisar apertar — por isso, entre dois tamanhos, o maior costuma servir melhor na legging.',
      ],
    },
    {
      titulo: 'Fica transparente?',
      paragrafos: [
        'Não. A gente prova cada modelo antes de colocar na loja, e o agachamento é justamente o teste que fazemos. O tecido é poliamida com elastano, de gramatura suficiente para não abrir.',
      ],
    },
  ],
  tops: [
    {
      titulo: 'Quanta sustentação você precisa',
      paragrafos: [
        'Para musculação e treino de baixo impacto, alça fina com forro duplo resolve — é o Top Energy. Para corrida, salto e treino de alto impacto, o que segura é alça larga com elástico interno: Top Essential e Top Urban.',
        'Todos têm entrada para bojo, então dá para ajustar a sustentação com o bojo que você já usa.',
      ],
    },
    {
      titulo: 'Transparência e forro',
      paragrafos: [
        'O forro duplo é o que evita transparência e dá o acabamento por dentro. O Top beach ainda tem tecnologia Black Out, que é a camada extra de opacidade.',
      ],
    },
    {
      titulo: 'Entre dois tamanhos, no top',
      paragrafos: [
        'Vá no menor. Sustentação em top vem do ajuste ao corpo — um número acima solta e a peça deixa de segurar, que é justamente o que você está comprando.',
      ],
    },
  ],
  shorts: [
    {
      titulo: 'Comprimento que não sobe na coxa',
      paragrafos: [
        'Shorts curto demais enrola no agachamento e no afundo, e a pessoa passa o treino ajeitando. O Shorts Runner tem comprimento médio pensado justamente para isso, e cós duplo com cintura alta que segura no lugar.',
      ],
    },
    {
      titulo: 'Bolso: onde o celular fica',
      paragrafos: [
        'O Shorts Runner tem dois bolsos profundos nas laterais, que aguentam celular e chave sem balançar. Nos outros modelos, o cós alto e firme segura o celular pequeno preso.',
      ],
    },
    {
      titulo: 'Proteção solar para treino ao ar livre',
      paragrafos: [
        'Shorts BC, Shorts Energy e Shorts Runner têm proteção solar FPS 50+, e conforto térmico que conduz o suor para fora em vez de deixar a peça encharcada. É o que muda no treino de rua e no calor.',
      ],
    },
  ],
};

const PERGUNTAS: Record<string, { pergunta: string; resposta: string }[]> = {
  leggings: [
    {
      pergunta: 'A legging fica transparente no agachamento?',
      resposta:
        'Não. Provamos cada modelo antes de colocar na loja, e o agachamento é o teste que fazemos. O tecido é poliamida com elastano, de gramatura suficiente para não abrir.',
    },
    {
      pergunta: 'Qual a diferença entre a Legging Energy e a Legging Runner?',
      resposta:
        'A Energy tem compressão média, ideal para musculação e dia a dia. A Runner tem compressão alta, bolso lateral, proteção solar FPS 50+ e tecnologia de termorregulação — feita para corrida e treino de impacto.',
    },
    {
      pergunta: 'Fiquei entre dois tamanhos na legging. Qual escolho?',
      resposta:
        'O maior. A compressão é média a alta e o tecido cede pouco, então o menor marca demais na cintura.',
    },
    {
      pergunta: 'As leggings têm bolso?',
      resposta:
        'A Legging Runner tem bolso lateral, com espaço para celular ou chave. Os outros modelos não têm bolso.',
    },
  ],
  tops: [
    {
      pergunta: 'Qual top segura mais para correr?',
      resposta:
        'O Top Essential e o Top Urban: os dois têm alta sustentação, com alças largas e elásticos internos. Para musculação e baixo impacto, o Top Energy resolve.',
    },
    {
      pergunta: 'Os tops têm bojo?',
      resposta:
        'Todos têm entrada para bojo, então você usa o bojo que preferir. Eles não vêm com bojo incluso.',
    },
    {
      pergunta: 'O top fica transparente?',
      resposta:
        'Não. Os modelos têm forro duplo, e o Top beach tem ainda tecnologia Black Out, que é uma camada extra de opacidade.',
    },
    {
      pergunta: 'Fiquei entre dois tamanhos no top. Qual escolho?',
      resposta:
        'O menor. A sustentação vem do ajuste ao corpo, e um número acima solta — a peça deixa de segurar.',
    },
  ],
  shorts: [
    {
      pergunta: 'O shorts sobe na coxa durante o treino?',
      resposta:
        'O Shorts Runner tem comprimento médio pensado para não subir, e cós duplo com cintura alta. Os outros modelos têm cós alto que segura a peça no lugar.',
    },
    {
      pergunta: 'Qual shorts tem bolso?',
      resposta:
        'O Shorts Runner, com dois bolsos profundos nas laterais que aguentam celular e chave.',
    },
    {
      pergunta: 'Os shorts têm proteção solar?',
      resposta:
        'Shorts BC, Shorts Energy e Shorts Runner têm proteção solar FPS 50+, além de conforto térmico que conduz o suor para fora do tecido.',
    },
  ],
};


const TITULO: Record<string, string> = {
  leggings: 'Legging Fitness Feminina — Cós Alto e Compressão',
  tops: 'Top Fitness Feminino — Sustentação para Treino',
  shorts: 'Shorts Fitness Feminino — Cós Alto e Bolso',
};

const DESCRICAO: Record<string, string> = {
  leggings:
    'Leggings de academia com cós alto, compressão média e tecido opaco que não fica transparente no agachamento. Do PP ao G, com envio para todo o Brasil.',
  tops: 'Tops de academia com sustentação para treino, entrada para bojo e tecido respirável. Do P ao G, com envio para todo o Brasil.',
  shorts:
    'Shorts de academia com cós alto, bolso lateral e tecido que acompanha o movimento. Do PP ao G, com envio para todo o Brasil.',
};

/** Texto de abertura da prateleira: o que o anúncio prometeu, dito de novo. */
const CHAMADA: Record<string, string> = {
  leggings:
    'Cós alto que não desce no agachamento, compressão média e tecido opaco. Provamos cada modelo antes de colocar na loja.',
  tops: 'Sustentação de verdade para treino, com entrada para bojo e tecido que respira.',
  shorts: 'Cós alto, bolso para o celular e liberdade de movimento nos dias de alta intensidade.',
};

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIAS_COM_PAGINA.map((categoria) => ({ categoria }));
}

export function generateMetadata({ params }: { params: { categoria: string } }) {
  const { categoria } = params;
  const rotulo = categories.find((c) => c.value === categoria)?.label ?? categoria;
  const title = `${TITULO[categoria] ?? rotulo} — NO EXCUSE`;
  const description = DESCRICAO[categoria] ?? '';

  return {
    title,
    description,
    alternates: { canonical: `/${categoria}` },
    openGraph: { title, description, url: `/${categoria}`, type: 'website' },
  };
}

export default async function CategoriaPage({ params }: { params: { categoria: string } }) {
  const { categoria } = params;
  if (!CATEGORIAS_COM_PAGINA.includes(categoria as (typeof CATEGORIAS_COM_PAGINA)[number])) {
    notFound();
  }

  const rotulo = categories.find((c) => c.value === categoria)?.label ?? categoria;
  const todos = await getProducts();
  const produtos = todos.filter((p) => p.category === categoria);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { nome: 'Início', url: STOREFRONT_URL },
          { nome: rotulo, url: `${STOREFRONT_URL}/${categoria}` },
        ])}
      />
      <JsonLd data={itemListSchema(produtos, STOREFRONT_URL)} />
      {PERGUNTAS[categoria] && <JsonLd data={faqSchema(PERGUNTAS[categoria])} />}

      <ProductsPageClient
        products={produtos}
        categoria={categoria as Category}
        chamada={CHAMADA[categoria]}
      />

      {/* Abaixo da grade: quem chegou quer ver as peças. Empurrar produto para
          baixo com parágrafo é trocar conversão por SEO — aqui as duas cabem,
          em ordem. */}
      {TEXTO[categoria] && (
        <div className="container-page pb-16">
          <section className="border-t border-line pt-12">
            <h2 className="section-title">Como escolher {rotulo.toLowerCase()}</h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {TEXTO[categoria].map((bloco) => (
                <div key={bloco.titulo}>
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em]">{bloco.titulo}</h3>
                  {bloco.paragrafos.map((texto) => (
                    <p key={texto} className="mt-3 text-sm leading-relaxed text-ink/70">
                      {texto}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {PERGUNTAS[categoria] && (
            <section className="mt-16 border-t border-line pt-12">
              <h2 className="section-title">Perguntas frequentes</h2>
              <div className="mt-8 max-w-2xl divide-y divide-line border-y border-line">
                {PERGUNTAS[categoria].map((p) => (
                  <details key={p.pergunta} className="group py-5">
                    <summary className="cursor-pointer list-none text-sm font-semibold">
                      {p.pergunta}
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-ink/70">{p.resposta}</p>
                  </details>
                ))}
              </div>
              <p className="mt-8 text-sm text-ink/60">
                Ainda em dúvida no tamanho?{' '}
                <Link href="/tabela-de-medidas" className="underline underline-offset-4">
                  Veja a tabela de medidas
                </Link>
                .
              </p>
            </section>
          )}
        </div>
      )}
    </>
  );
}
