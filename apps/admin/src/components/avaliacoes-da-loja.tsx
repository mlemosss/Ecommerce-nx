'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';

interface AvaliacaoDaLoja {
  id: string;
  customerName: string;
  email: string | null;
  quote: string;
  rating: number;
  photoUrl: string | null;
  active: boolean;
  createdAt: string;
}

/**
 * Fila de aprovação das avaliações da loja.
 *
 * Vêm do link público `/avaliar-loja`, aberto a qualquer pessoa — inclusive a
 * quem comprou antes de o site existir. Por ser aberto, nada entra no ar
 * sozinho: chega como pendente e só aparece na home depois que a lojista lê.
 *
 * O e-mail fica aqui e só aqui. A cliente entregou para ser respondida, não
 * para ser publicada — a listagem pública do site nem carrega o campo. Uma
 * nota baixa respondida no mesmo dia costuma virar cliente; ignorada, vira
 * avaliação no Google.
 */
export function AvaliacoesDaLoja() {
  const [itens, setItens] = useState<AvaliacaoDaLoja[] | null>(null);
  const [erro, setErro] = useState('');
  const [copiada, setCopiada] = useState('');

  function carregar() {
    api
      .get<AvaliacaoDaLoja[]>('/testimonials/all')
      .then(setItens)
      .catch(() => setErro('Não foi possível carregar as avaliações da loja.'));
  }

  useEffect(carregar, []);

  async function alternarPublicacao(a: AvaliacaoDaLoja) {
    await api.patch(`/testimonials/${a.id}`, {
      customerName: a.customerName,
      quote: a.quote,
      rating: a.rating,
      photoUrl: a.photoUrl ?? undefined,
      active: !a.active,
    });
    carregar();
  }

  async function excluir(a: AvaliacaoDaLoja) {
    if (!window.confirm(`Excluir a avaliação de ${a.customerName}?`)) return;
    await api.delete(`/testimonials/${a.id}`);
    carregar();
  }

  function assuntoDe(a: AvaliacaoDaLoja): string {
    return a.rating >= 4
      ? 'Obrigada pela sua avaliação — NO EXCUSE'
      : 'Sobre sua avaliação — NO EXCUSE';
  }

  function corpoDe(a: AvaliacaoDaLoja): string {
    return a.rating >= 4
      ? `Oi!\n\nAcabei de ler sua avaliação e fiquei muito feliz. Obrigada de verdade por ter separado um tempo para escrever — para uma marca do nosso tamanho, isso faz uma diferença enorme.\n\nQualquer coisa que precisar, é só responder este e-mail.\n\nNO EXCUSE`
      : `Oi!\n\nLi sua avaliação e queria entender melhor o que aconteceu para poder resolver. Me conta o que não foi como você esperava?\n\nObrigada por ter falado com a gente em vez de deixar passar.\n\nNO EXCUSE`;
  }

  /**
   * Abre a caixa de escrita do Gmail, e não `mailto:`.
   *
   * `mailto:` depende de um programa de e-mail instalado e registrado no
   * Windows — sem isso o clique simplesmente não faz nada, sem erro nenhum,
   * que foi exatamente o que aconteceu aqui. O contato da loja é Gmail, e a
   * sessão já está aberta neste navegador: o link web sempre abre.
   */
  function linkGmail(a: AvaliacaoDaLoja): string {
    const params = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: a.email ?? '',
      su: assuntoDe(a),
      body: corpoDe(a),
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  }

  async function copiarMensagem(a: AvaliacaoDaLoja) {
    await navigator.clipboard?.writeText(`${a.email ?? ''}\n\n${assuntoDe(a)}\n\n${corpoDe(a)}`);
    setCopiada(a.id);
  }

  const pendentes = itens?.filter((a) => !a.active).length ?? 0;

  return (
    <div>
      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{erro}</p>}
      {!itens && !erro && <p className="text-sm text-black/50">Carregando...</p>}

      {pendentes > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {pendentes === 1
            ? '1 avaliação da loja esperando você aprovar.'
            : `${pendentes} avaliações da loja esperando você aprovar.`}
        </p>
      )}

      {itens?.length === 0 && (
        <div className="card">
          <p className="text-sm font-semibold">Nenhuma avaliação da loja ainda.</p>
          <p className="mt-1 text-sm text-black/60">
            Mande o link abaixo para quem já comprou — inclusive para as clientes de antes do site.
          </p>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {itens?.map((a) => (
          <div key={a.id} className={`card !p-3 ${a.active ? '' : 'border border-amber-200'}`}>
            <div className="flex items-start gap-3">
              {a.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.photoUrl}
                  alt={`Foto enviada por ${a.customerName}`}
                  className="h-24 w-20 shrink-0 rounded-lg object-cover"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="text-xs text-amber-500">
                  {'★'.repeat(a.rating)}
                  {'☆'.repeat(5 - a.rating)}
                </p>
                <p className="mt-1 text-sm text-black/75">{a.quote}</p>
                <p className="mt-1 text-xs text-black/40">
                  {a.customerName} · {formatDate(a.createdAt)}
                </p>
                {a.email && <p className="text-xs text-black/40">{a.email}</p>}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => alternarPublicacao(a)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    a.active ? 'bg-green-100 text-green-700' : 'bg-black/10 text-black/50'
                  }`}
                >
                  {a.active ? 'No site' : 'Pendente'}
                </button>
                <button
                  type="button"
                  onClick={() => excluir(a)}
                  className="text-black/30 hover:text-red-600"
                  aria-label="Excluir"
                >
                  ✕
                </button>
              </div>
            </div>

            {a.email && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href={linkGmail(a)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {a.rating >= 4 ? 'Agradecer no Gmail' : 'Falar com a cliente'}
                </a>
                {/* Para quem prefere responder do celular ou de outro e-mail:
                    copia o endereço e a mensagem inteira de uma vez. */}
                <button
                  type="button"
                  onClick={() => copiarMensagem(a)}
                  className="rounded-lg bg-black/10 px-3 py-1.5 text-xs font-semibold text-black/60"
                >
                  {copiada === a.id ? 'Copiado!' : 'Copiar mensagem'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
