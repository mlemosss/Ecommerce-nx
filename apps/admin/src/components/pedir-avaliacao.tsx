'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface PedidoPendente {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  reviewToken: string | null;
  shippedAt: string | null;
  emailEnviadoEm: string | null;
  produtos: string[];
}

const LOJA_URL = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'https://www.noexcusenx.com.br'
).replace(/\/$/, '');

/** "há 12 dias", que é o que decide se vale pedir agora. */
function haQuantosDias(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Quem pedir avaliação, e o botão para pedir.
 *
 * O link por pedido já existia, mas só dentro do pedido — quem quisesse pedir a
 * dez clientes abria dez pedidos e tentava lembrar onde parou. Aqui a lista vem
 * pronta, na ordem de quem recebeu primeiro, e some sozinha conforme as
 * avaliações chegam.
 *
 * O WhatsApp abre com a mensagem escrita. O e-mail automático já sai três dias
 * depois do envio, mas e-mail de loja pequena vira promoção não lida; a mesma
 * pergunta no WhatsApp é respondida.
 */
export function PedirAvaliacao() {
  const [pedidos, setPedidos] = useState<PedidoPendente[] | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api
      .get<PedidoPendente[]>('/reviews/pendentes')
      .then(setPedidos)
      .catch(() => setErro('Não foi possível carregar a lista agora.'));
  }, []);

  function link(p: PedidoPendente): string {
    return `${LOJA_URL}/avaliar/${p.reviewToken}`;
  }

  function mensagem(p: PedidoPendente): string {
    const primeiroNome = p.customerName.trim().split(/\s+/)[0] ?? '';
    const peca = p.produtos[0];
    return (
      `Oi, ${primeiroNome}! Aqui é da NO EXCUSE 💪\n\n` +
      `Você já conseguiu usar ${peca ? `a ${peca}` : 'a peça'}? ` +
      `Se puder contar em duas linhas o que achou, ajuda demais quem está em dúvida no tamanho — ` +
      `e se quiser mandar uma foto usando, melhor ainda!\n\n` +
      `É rapidinho, sem precisar de senha: ${link(p)}`
    );
  }

  function whatsapp(p: PedidoPendente): string {
    const tel = (p.customerPhone ?? '').replace(/\D/g, '');
    const numero = tel.length >= 10 ? (tel.startsWith('55') ? tel : `55${tel}`) : '';
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem(p))}`;
  }

  function copiar(p: PedidoPendente) {
    navigator.clipboard
      .writeText(link(p))
      .then(() => {
        setCopiado(p.id);
        setTimeout(() => setCopiado((a) => (a === p.id ? null : a)), 2000);
      })
      .catch(() => setErro('Não foi possível copiar.'));
  }

  if (erro) {
    return <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{erro}</p>;
  }

  if (!pedidos) {
    return <p className="text-center text-sm text-black/50">Carregando...</p>;
  }

  if (pedidos.length === 0) {
    return (
      <div className="card">
        <p className="text-sm font-semibold">Ninguém para pedir agora.</p>
        <p className="mt-1 text-sm text-black/60">
          A lista mostra quem já recebeu a peça e ainda não avaliou. Assim que você marcar um pedido
          como <strong>Enviado</strong>, ele aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="card bg-ink text-white">
        <p className="text-sm font-semibold">
          {pedidos.length === 1
            ? '1 cliente pode avaliar'
            : `${pedidos.length} clientes podem avaliar`}
        </p>
        <p className="mt-1 text-sm text-white/70">
          É o que mais falta na loja hoje. Cada avaliação com foto vale mais que qualquer mudança de
          página — quem chega não conhece a marca e decide pelo que outra cliente disse.
        </p>
      </div>

      {pedidos.map((p) => {
        const dias = haQuantosDias(p.shippedAt);
        const temToken = Boolean(p.reviewToken);

        return (
          <div key={p.id} className="card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{p.customerName}</p>
              <span className="text-xs text-black/45">#{p.orderNumber}</span>
            </div>

            <p className="mt-1 text-sm text-black/60">{p.produtos.join(' · ')}</p>

            <p className="mt-1 text-xs text-black/45">
              {dias === null
                ? 'Enviado'
                : dias === 0
                ? 'Enviado hoje'
                : `Enviado há ${dias} ${dias === 1 ? 'dia' : 'dias'}`}
              {p.emailEnviadoEm && ' · e-mail automático já saiu'}
            </p>

            {/* Recém-postado: a peça pode nem ter chegado, e pedir agora rende
                "ainda não recebi". O aviso é para a lojista decidir, não para
                bloquear — ela sabe quando a entrega é rápida. */}
            {dias !== null && dias < 3 && (
              <p className="mt-2 text-xs text-amber-700">
                Talvez ainda não tenha chegado. Vale esperar uns dias.
              </p>
            )}

            {temToken ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a
                  href={whatsapp(p)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Pedir no WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => copiar(p)}
                  className="text-xs font-semibold text-accent underline underline-offset-2"
                >
                  {copiado === p.id ? 'Link copiado!' : 'Copiar link'}
                </button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-black/45">
                Este pedido é antigo e não tem link. Abra-o em Pedidos e clique em “Gerar link de
                avaliação”.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
