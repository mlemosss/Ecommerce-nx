'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '../../components/top-bar';
import { api } from '../../lib/api';
import { formatPrice } from '../../lib/format';

interface DiaDoResumo {
  dia: string;
  views: number;
  sessoes: number;
  pedidos: number;
}

interface Resumo {
  de: string;
  ate: string;
  views: number;
  sessoes: number;
  pedidos: number;
  pedidosPagos: number;
  receita: number;
  conversao: number | null;
  ticketMedio: number | null;
  porDia: DiaDoResumo[];
  paginas: { rota: string; views: number }[];
}

/** Hoje e ontem em Brasília, no formato do campo de data. */
function diaEmBrasilia(deslocamento = 0): string {
  const agora = new Date();
  const local = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  local.setUTCDate(local.getUTCDate() + deslocamento);
  return local.toISOString().slice(0, 10);
}

const ATALHOS = [
  { label: 'Hoje', de: () => diaEmBrasilia(), ate: () => diaEmBrasilia() },
  { label: 'Ontem', de: () => diaEmBrasilia(-1), ate: () => diaEmBrasilia(-1) },
  { label: '7 dias', de: () => diaEmBrasilia(-6), ate: () => diaEmBrasilia() },
  { label: '30 dias', de: () => diaEmBrasilia(-29), ate: () => diaEmBrasilia() },
  { label: '90 dias', de: () => diaEmBrasilia(-89), ate: () => diaEmBrasilia() },
];

/** "2026-08-19" → "19/08". Sem `new Date`, que desloca o dia pelo fuso. */
function diaCurto(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

/**
 * Visitas e vendas na mesma tela.
 *
 * A loja já tinha Clarity, Pixel e GTM — e nenhum deles responde, aqui dentro,
 * a pergunta que a lojista faz de manhã: quantas pessoas entraram e quantas
 * compraram. Para saber isso ela abriria três sites de terceiros e juntaria os
 * números de cabeça.
 *
 * Visita sozinha não decide nada: mil visitas é ótimo ou péssimo dependendo de
 * quantas viraram pedido. É a razão entre as duas que diz se vale gastar em
 * anúncio — por isso as duas moram no mesmo lugar.
 */
export default function MetricasPage() {
  const [de, setDe] = useState(() => diaEmBrasilia(-29));
  const [ate, setAte] = useState(() => diaEmBrasilia());
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setResumo(null);
    setErro('');
    api
      .get<Resumo>(`/metrics/resumo?de=${de}&ate=${ate}`)
      .then(setResumo)
      .catch(() => setErro('Não foi possível carregar as métricas.'));
  }, [de, ate]);

  function aplicarAtalho(atalho: (typeof ATALHOS)[number]) {
    setDe(atalho.de());
    setAte(atalho.ate());
  }

  const atalhoAtivo = ATALHOS.find((a) => a.de() === de && a.ate() === ate)?.label;
  const umDiaSo = de === ate;

  const maiorDia = Math.max(1, ...(resumo?.porDia.map((d) => d.views) ?? [1]));

  return (
    <div>
      <TopBar title="Métricas" />

      <div className="px-4 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {ATALHOS.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => aplicarAtalho(a)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                atalhoAtivo === a.label ? 'bg-ink text-white' : 'bg-black/5 text-black/60'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Intervalo livre, para quando o atalho não serve: o dia em que a
            campanha entrou no ar, a semana da promoção, o fim de semana que
            rendeu. Data de fim antes da de início devolveria vazio sem
            explicar, então os campos se ajustam um ao outro. */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-black/60">
          <label className="flex items-center gap-1.5">
            De
            <input
              type="date"
              value={de}
              max={ate}
              onChange={(e) => e.target.value && setDe(e.target.value)}
              className="rounded-lg border border-black/10 px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-1.5">
            até
            <input
              type="date"
              value={ate}
              min={de}
              max={diaEmBrasilia()}
              onChange={(e) => e.target.value && setAte(e.target.value)}
              className="rounded-lg border border-black/10 px-2 py-1"
            />
          </label>
          {umDiaSo && <span className="text-black/45">— um dia só</span>}
        </div>

        {erro && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{erro}</p>}
        {!resumo && !erro && <p className="mt-6 text-sm text-black/50">Carregando...</p>}

        {resumo && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="card !p-3">
                <p className="text-xs text-black/45">Visitantes</p>
                <p className="mt-1 text-2xl font-black">{resumo.sessoes}</p>
                <p className="text-xs text-black/45">{resumo.views} páginas vistas</p>
              </div>
              <div className="card !p-3">
                <p className="text-xs text-black/45">Pedidos pagos</p>
                <p className="mt-1 text-2xl font-black">{resumo.pedidosPagos}</p>
                <p className="text-xs text-black/45">
                  {resumo.pedidos} {resumo.pedidos === 1 ? 'pedido no total' : 'pedidos no total'}
                </p>
              </div>
              <div className="card !p-3">
                <p className="text-xs text-black/45">Conversão</p>
                <p className="mt-1 text-2xl font-black">
                  {resumo.conversao === null ? '—' : `${resumo.conversao.toFixed(1)}%`}
                </p>
                <p className="text-xs text-black/45">de cada 100 visitantes</p>
              </div>
              <div className="card !p-3">
                <p className="text-xs text-black/45">Receita</p>
                <p className="mt-1 text-2xl font-black">{formatPrice(resumo.receita)}</p>
                <p className="text-xs text-black/45">
                  {resumo.ticketMedio === null
                    ? 'sem venda no período'
                    : `${formatPrice(resumo.ticketMedio)} por pedido`}
                </p>
              </div>
            </div>

            {/* Barra por dia. Um gráfico de verdade traria uma biblioteca
                inteira para desenhar trinta retângulos. */}
            {/* Com um dia só, uma barra sozinha não compara com nada e ocupa
                espaço dizendo o que os cartões acima já disseram. */}
            {!umDiaSo && (
              <>
            <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-black/50">
              Dia a dia
            </h2>
            <div className="card mt-3 !p-3">
              {resumo.porDia.length === 0 && (
                <p className="text-sm text-black/50">
                  Ainda sem visitas registradas. A contagem começa agora — volte amanhã.
                </p>
              )}
              <div className="space-y-1.5">
                {resumo.porDia.map((d) => (
                  <div key={d.dia} className="flex items-center gap-2 text-xs">
                    <span className="w-12 shrink-0 text-black/45">{diaCurto(d.dia)}</span>
                    <div className="h-4 flex-1 rounded-sm bg-black/5">
                      <div
                        className="h-4 rounded-sm bg-ink"
                        style={{ width: `${Math.round((d.views / maiorDia) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right font-semibold">{d.views}</span>
                    <span className="w-16 shrink-0 text-right text-black/45">
                      {d.pedidos > 0 ? `${d.pedidos} pedido${d.pedidos > 1 ? 's' : ''}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
              </>
            )}

            <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-black/50">
              Páginas mais vistas
            </h2>
            <div className="card mt-3 !p-3">
              {resumo.paginas.length === 0 && (
                <p className="text-sm text-black/50">Nada registrado ainda.</p>
              )}
              <ul className="space-y-1.5 text-sm">
                {resumo.paginas.map((p) => (
                  <li key={p.rota} className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-black/70">{p.rota}</span>
                    <span className="shrink-0 font-semibold">{p.views}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card mt-3">
              <p className="text-sm font-semibold">O que estes números são</p>
              <p className="mt-1 text-sm leading-relaxed text-black/60">
                Contagem própria da loja, sem cookie e sem identificar ninguém.{' '}
                <strong>Visitantes</strong> conta abas abertas, não pessoas — quem volta amanhã conta
                de novo. Suas próprias visitas ao site entram na conta; o painel, não.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-black/60">
                Para ver onde a cliente clicou e até onde rolou a página, o Clarity continua sendo o
                lugar — ele grava a navegação, o que aqui não é feito de propósito.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
