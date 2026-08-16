'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '../../components/top-bar';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';

interface StockAlert {
  id: string;
  email: string;
  productId: string;
  productName: string;
  slug: string;
  color: string;
  size: string;
  createdAt: string;
  notifiedAt: string | null;
  /** A combinação pedida não existe no cadastro — é procura por algo que a loja não produz. */
  naoCadastrada: boolean;
}

type Aba = 'esperando' | 'avisados';

export default function AviseMePage() {
  const [alertas, setAlertas] = useState<StockAlert[] | null>(null);
  const [aba, setAba] = useState<Aba>('esperando');
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState<string | null>(null);

  async function excluir(a: StockAlert) {
    if (!window.confirm(`Excluir o pedido de ${a.email} para ${a.productName} ${a.color}/${a.size}?`)) {
      return;
    }
    setExcluindo(a.id);
    try {
      await api.delete(`/stock-alerts/${a.id}`);
      setAlertas((prev) => (prev ?? []).filter((x) => x.id !== a.id));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir.');
    } finally {
      setExcluindo(null);
    }
  }

  useEffect(() => {
    api
      .get<StockAlert[]>('/stock-alerts')
      .then(setAlertas)
      .catch((e) => setErro(e?.message ?? 'Não foi possível carregar a lista.'));
  }, []);

  const esperando = useMemo(() => (alertas ?? []).filter((a) => !a.notifiedAt), [alertas]);
  const avisados = useMemo(() => (alertas ?? []).filter((a) => a.notifiedAt), [alertas]);
  const lista = aba === 'esperando' ? esperando : avisados;

  /**
   * Agrupa por peça + cor + tamanho e ordena pelo que mais gente espera.
   *
   * É a lista de produção, e é mais confiável que estimativa de demanda: cada
   * linha é uma pessoa que chegou na peça, escolheu cor e tamanho, e deixou o
   * e-mail. O que aparece marcado como "não cadastrada" é procura por algo que
   * a loja nem fabrica — o dado mais acionável da tela.
   */
  const porVariacao = useMemo(() => {
    const mapa = new Map<
      string,
      { productName: string; color: string; size: string; naoCadastrada: boolean; emails: string[] }
    >();
    for (const a of esperando) {
      const chave = `${a.productId}|${a.color}|${a.size}`;
      const atual = mapa.get(chave);
      if (atual) atual.emails.push(a.email);
      else
        mapa.set(chave, {
          productName: a.productName,
          color: a.color,
          size: a.size,
          naoCadastrada: a.naoCadastrada,
          emails: [a.email],
        });
    }
    return [...mapa.values()].sort((x, y) => y.emails.length - x.emails.length);
  }, [esperando]);

  function copiarEmails(emails: string[]) {
    navigator.clipboard.writeText(emails.join(', ')).catch(() => undefined);
  }

  return (
    <div>
      <TopBar title="Avise-me quando chegar" />

      <div className="px-4 pt-4">
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {alertas === null && !erro && (
          <p className="mt-8 text-center text-sm text-black/50">Carregando...</p>
        )}

        {alertas && alertas.length === 0 && (
          <div className="card mt-4">
            <p className="text-sm font-semibold">Ninguém pediu aviso ainda.</p>
            <p className="mt-1 text-sm text-black/55">
              Quando uma cliente escolher uma cor e um tamanho sem estoque, ela pode deixar o
              e-mail — e a peça aparece aqui, com quantas pessoas estão esperando.
            </p>
          </div>
        )}

        {alertas && alertas.length > 0 && (
          <>
            <div className="mt-2 flex rounded-full border border-black/10 p-0.5">
              {(
                [
                  { key: 'esperando' as Aba, label: `Esperando (${esperando.length})` },
                  { key: 'avisados' as Aba, label: `Já avisados (${avisados.length})` },
                ]
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setAba(t.key)}
                  className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    aba === t.key ? 'bg-ink text-white' : 'text-black/60'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {aba === 'esperando' && porVariacao.length > 0 && (
              <>
                <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-black/50">
                  O que produzir primeiro
                </h2>
                <div className="mt-2 space-y-2">
                  {porVariacao.map((v) => (
                    <div key={`${v.productName}|${v.color}|${v.size}`} className="card !p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{v.productName}</p>
                          <p className="text-xs text-black/55">
                            {v.color} · tamanho {v.size}
                          </p>
                          {v.naoCadastrada && (
                            <p className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                              não existe no cadastro
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-lg font-bold tabular-nums">{v.emails.length}</span>
                          <span className="text-[10px] uppercase tracking-wide text-black/40">
                            {v.emails.length === 1 ? 'pessoa' : 'pessoas'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copiarEmails(v.emails)}
                        className="mt-2 text-xs font-semibold text-accent underline underline-offset-2"
                      >
                        Copiar os e-mails
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-black/50">
              {aba === 'esperando' ? 'Todos os pedidos' : 'Já avisados'}
            </h2>
            <div className="mt-2 space-y-2">
              {lista.length === 0 && (
                <p className="rounded-2xl bg-neutral-100 px-4 py-6 text-center text-sm text-black/50">
                  {aba === 'esperando'
                    ? 'Ninguém esperando no momento.'
                    : 'Nenhum aviso enviado ainda.'}
                </p>
              )}
              {lista.map((a) => (
                <div key={a.id} className="card flex items-start justify-between gap-3 !p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.email}</p>
                    <p className="text-xs text-black/55">
                      <Link href={`/produtos/${a.productId}`} className="underline underline-offset-2">
                        {a.productName}
                      </Link>{' '}
                      · {a.color} · {a.size}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-[11px] text-black/40">
                      {formatDate(a.notifiedAt ?? a.createdAt)}
                    </span>
                    {/* Sem isto, cadastro de teste ou e-mail digitado errado
                        fica para sempre inflando a contagem de reposição. */}
                    <button
                      type="button"
                      onClick={() => excluir(a)}
                      disabled={excluindo === a.id}
                      className="text-lg leading-none text-red-500 disabled:opacity-40"
                      aria-label={`Excluir o pedido de ${a.email}`}
                      title="Excluir"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 text-xs leading-relaxed text-black/45">
              Estes e-mails foram deixados para uma finalidade só: avisar sobre aquela peça. Usar a
              lista para outra coisa é comunicação sem consentimento.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
