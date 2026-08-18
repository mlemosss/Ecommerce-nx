'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '../../components/top-bar';
import { api } from '../../lib/api';
import { formatPrice } from '../../lib/format';

interface ItemDoCarrinho {
  productName: string;
  color: string;
  size: string;
  quantity: number;
}

interface CarrinhoParado {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  total: number;
  itens: ItemDoCarrinho[];
  abandonadoEm: string;
  emailEnviadoEm: string | null;
}

const LOJA_URL = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'https://www.noexcusenx.com.br'
).replace(/\/$/, '');

function haQuantoTempo(iso: string): string {
  const horas = Math.floor((Date.now() - new Date(iso).getTime()) / (60 * 60 * 1000));
  if (horas < 1) return 'agora há pouco';
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

/**
 * Carrinhos parados, para chamar no WhatsApp.
 *
 * O e-mail automático continua saindo duas horas depois. Mas e-mail de loja
 * pequena cai em "Promoções" e não é lido — e a mesma pergunta no WhatsApp é
 * respondida. Com o volume de hoje são pouquíssimos carrinhos por semana:
 * automatizar exigiria a API paga da Meta para resolver um problema de três
 * mensagens.
 *
 * A mensagem cita a peça e pergunta se ficou dúvida de tamanho, que é o que de
 * fato trava a compra de roupa — e não "você esqueceu algo no carrinho", que
 * soa a cobrança.
 */
export default function CarrinhosPage() {
  const [carrinhos, setCarrinhos] = useState<CarrinhoParado[] | null>(null);
  const [erro, setErro] = useState('');

  function carregar() {
    api
      .get<CarrinhoParado[]>('/abandoned-cart')
      .then(setCarrinhos)
      .catch(() => setErro('Não foi possível carregar os carrinhos agora.'));
  }

  useEffect(carregar, []);

  function mensagem(c: CarrinhoParado): string {
    const primeiroNome = (c.name ?? '').trim().split(/\s+/)[0];
    const peca = c.itens[0]?.productName;
    const abertura = primeiroNome ? `Oi, ${primeiroNome}!` : 'Oi!';

    return (
      `${abertura} Aqui é da NO EXCUSE 💪\n\n` +
      `Vi que você separou ${peca ? `a ${peca}` : 'umas peças'} aqui na loja. ` +
      `Ficou alguma dúvida de tamanho? Te ajudo a escolher 😊\n\n` +
      `Se quiser retomar: ${LOJA_URL}/carrinho`
    );
  }

  function whatsapp(c: CarrinhoParado): string {
    const tel = (c.phone ?? '').replace(/\D/g, '');
    const numero = tel.length >= 10 ? (tel.startsWith('55') ? tel : `55${tel}`) : '';
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem(c))}`;
  }

  async function dispensar(c: CarrinhoParado) {
    await api.post(`/abandoned-cart/${c.id}/dispensar`, {});
    carregar();
  }

  return (
    <div>
      <TopBar title="Carrinhos parados" />

      <div className="px-4 pt-4">
        {erro && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{erro}</p>}
        {!carrinhos && !erro && (
          <p className="text-center text-sm text-black/50">Carregando...</p>
        )}

        {carrinhos?.length === 0 && (
          <div className="card">
            <p className="text-sm font-semibold">Nenhum carrinho parado.</p>
            <p className="mt-1 text-sm text-black/60">
              Aparecem aqui as clientes que montaram um carrinho, marcaram que queriam receber
              lembrete, e não finalizaram. Somem sozinhas quando compram.
            </p>
          </div>
        )}

        {carrinhos && carrinhos.length > 0 && (
          <>
            <div className="card bg-ink text-white">
              <p className="text-sm font-semibold">
                {carrinhos.length === 1
                  ? '1 carrinho esperando'
                  : `${carrinhos.length} carrinhos esperando`}
              </p>
              <p className="mt-1 text-sm text-white/70">
                Elas chegaram até o checkout e pararam. Uma mensagem no WhatsApp perguntando do
                tamanho recupera mais do que qualquer e-mail.
              </p>
            </div>

            <div className="mt-2 space-y-2">
              {carrinhos.map((c) => (
                <div key={c.id} className="card">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{c.name || c.email}</p>
                    <span className="text-sm font-bold">{formatPrice(c.total)}</span>
                  </div>

                  <ul className="mt-2 space-y-0.5 text-sm text-black/60">
                    {c.itens.map((i, idx) => (
                      <li key={idx}>
                        {i.quantity}× {i.productName} · {i.color} · {i.size}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-2 text-xs text-black/45">
                    Parou {haQuantoTempo(c.abandonadoEm)}
                    {c.emailEnviadoEm && ' · e-mail automático já saiu'}
                    {!c.phone && ' · sem telefone'}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {c.phone ? (
                      <a
                        href={whatsapp(c)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Chamar no WhatsApp
                      </a>
                    ) : (
                      <a
                        href={`mailto:${c.email}`}
                        className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Escrever por e-mail
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => dispensar(c)}
                      className="text-xs font-semibold text-black/45 underline underline-offset-2"
                    >
                      Já resolvi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mt-6 text-xs leading-relaxed text-black/45">
          Só aparece quem marcou que queria receber lembrete, e só nos primeiros 7 dias. Chamar
          alguém por um carrinho de três semanas atrás não resgata venda — lembra que a loja tem o
          telefone dela.
        </p>
      </div>
    </div>
  );
}
