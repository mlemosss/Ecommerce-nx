import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings } from '../../lib/api';
import { categories } from '../../lib/products';

export const metadata: Metadata = {
  title: 'Tabela de Medidas: Legging, Top e Shorts — NO EXCUSE',
  description:
    'Medidas em centímetros de cintura, quadril e busto por tamanho, do PP ao GG. Como medir e como escolher entre dois tamanhos nas peças NO EXCUSE.',
  alternates: { canonical: '/tabela-de-medidas' },
};

interface LinhaDeMedida {
  category: string;
  size: string;
  bust?: number;
  waist?: number;
  hip?: number;
}

/**
 * A tabela de medidas em HTML, numa página própria.
 *
 * Ela já existia — dentro de um modal em JavaScript, montado só depois do
 * clique. Para o Google e para qualquer assistente, isso é o mesmo que não
 * existir: conferi o HTML da loja no ar e não havia uma única ocorrência de
 * "cintura (cm)".
 *
 * E é o dado mais citável que a loja tem. "Que tamanho de legging eu uso com
 * 72 de cintura?" é exatamente o tipo de pergunta que manda gente para um site
 * — e a resposta estava trancada atrás de um clique.
 *
 * Continua vindo de Configurações: a tabela é a mesma do provador, e duas
 * cópias divergiriam no dia em que a lojista mudasse uma medida.
 */
export default async function TabelaDeMedidasPage() {
  const settings = await getSettings();

  let linhas: LinhaDeMedida[] = [];
  try {
    const bruto = JSON.parse(settings.sizeGuide || '[]');
    linhas = Array.isArray(bruto) ? bruto : [];
  } catch {
    linhas = [];
  }

  const porCategoria = categories
    .map((c) => ({
      valor: c.value,
      rotulo: c.label,
      medidas: linhas.filter((l) => l.category === c.value),
    }))
    .filter((c) => c.medidas.length > 0);

  return (
    <div className="container-page py-10 sm:py-14">
      <nav className="mb-8 text-[11px] uppercase tracking-[0.14em] text-ink/60">
        <Link href="/" className="underline-offset-4 hover:underline">
          Início
        </Link>{' '}
        / <span className="text-ink">Tabela de medidas</span>
      </nav>

      <p className="eyebrow text-ink/50">Antes de escolher</p>
      <h1 className="section-title mt-3">Tabela de medidas</h1>
      <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink/70">
        Todas as medidas são do <strong>corpo</strong>, em centímetros — não da peça. Meça por cima
        da roupa de baixo, com a fita justa e sem apertar.
      </p>

      {porCategoria.length === 0 && (
        <p className="mt-8 text-sm text-ink/60">
          A tabela ainda não foi cadastrada. Fale com a gente no WhatsApp que ajudamos a escolher o
          tamanho.
        </p>
      )}

      {porCategoria.map((c) => (
        <section key={c.valor} className="mt-12">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em]">{c.rotulo}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[22rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/20 text-left">
                  <th className="py-2 pr-4 font-semibold">Tamanho</th>
                  {c.medidas.some((m) => m.bust) && (
                    <th className="py-2 pr-4 font-semibold">Busto (cm)</th>
                  )}
                  {c.medidas.some((m) => m.waist) && (
                    <th className="py-2 pr-4 font-semibold">Cintura (cm)</th>
                  )}
                  {c.medidas.some((m) => m.hip) && (
                    <th className="py-2 font-semibold">Quadril (cm)</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {c.medidas.map((m) => (
                  <tr key={`${c.valor}-${m.size}`} className="border-b border-line">
                    <td className="py-2.5 pr-4 font-semibold">{m.size}</td>
                    {c.medidas.some((x) => x.bust) && (
                      <td className="py-2.5 pr-4 tabular-nums">{m.bust ?? '—'}</td>
                    )}
                    {c.medidas.some((x) => x.waist) && (
                      <td className="py-2.5 pr-4 tabular-nums">{m.waist ?? '—'}</td>
                    )}
                    {c.medidas.some((x) => x.hip) && (
                      <td className="py-2.5 tabular-nums">{m.hip ?? '—'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="mt-14 border-t border-line pt-10">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em]">Como medir</h2>
        <dl className="mt-5 max-w-xl space-y-4 text-sm leading-relaxed text-ink/70">
          <div>
            <dt className="font-semibold text-ink">Cintura</dt>
            <dd>Na parte mais estreita do tronco, acima do umbigo. É a medida que manda na legging e no shorts.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Quadril</dt>
            <dd>Na parte mais larga, com os pés juntos.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Busto</dt>
            <dd>Passando a fita pela parte mais cheia, com o braço relaxado. É a medida do top.</dd>
          </div>
        </dl>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em]">Fiquei entre dois tamanhos</h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/70">
          Nas <strong>leggings e shorts</strong>, vá no maior: a compressão é média a alta e o tecido
          cede pouco, então o menor marca demais na cintura. Nos <strong>tops</strong>, o menor
          costuma servir melhor — sustentação vem do ajuste, e um número acima solta.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/70">
          Na dúvida, manda sua altura, seu peso e as medidas no WhatsApp. A gente veste as peças e
          responde com o tamanho — é mais rápido que devolver depois.
        </p>
        <Link href="/produtos" className="btn-secondary mt-8 inline-flex">
          Ver as peças
        </Link>
      </section>
    </div>
  );
}
