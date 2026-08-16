'use client';

import { useState } from 'react';
import { getOrderPayment, type OrderPayment } from '../lib/api';

/**
 * "Pagar" num pedido em aberto, dentro da conta.
 *
 * O QR do Pix era buscado uma vez no checkout e guardado na sessão da aba —
 * fechou a aba, sumiu, e a pessoa ficava com um pedido em aberto sem nenhum
 * caminho para pagar. Aqui ele é buscado de novo na hora.
 *
 * O link da fatura aparece sempre que existe, mesmo no Pix: é lá que dá para
 * trocar a forma de pagamento, e é a saída quando o QR falha.
 */
export function OrderPaymentPanel({
  orderId,
  token,
}: {
  orderId: string;
  token: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState<OrderPayment | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  async function abrir() {
    if (aberto) {
      setAberto(false);
      return;
    }
    setAberto(true);
    if (dados || !token) return;

    setCarregando(true);
    setErro('');
    const r = await getOrderPayment(token, orderId);
    if (r) setDados(r);
    else setErro('Não foi possível carregar o pagamento agora. Tente de novo em instantes.');
    setCarregando(false);
  }

  function copiar(payload: string) {
    navigator.clipboard
      .writeText(payload)
      .then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
      })
      .catch(() => undefined);
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={abrir}
        aria-expanded={aberto}
        className="text-xs font-semibold uppercase tracking-[0.12em] underline underline-offset-4 hover:no-underline"
      >
        {aberto ? 'Fechar' : 'Pagar este pedido'}
      </button>

      {aberto && (
        <div className="mt-3 border border-line bg-paper p-4">
          {carregando && <p className="text-sm text-ink/60">Carregando…</p>}
          {erro && (
            <p className="text-sm text-ink/70" role="alert">
              {erro}
            </p>
          )}

          {dados?.alreadyPaid && (
            <p className="text-sm text-ink/70">Este pedido já foi pago. Obrigada!</p>
          )}

          {dados && !dados.alreadyPaid && (
            <div className="space-y-4">
              {dados.pix && (
                <div>
                  <p className="text-sm font-semibold">Pague com Pix</p>
                  <p className="mt-1 text-sm text-ink/60">
                    Abra o aplicativo do seu banco, escolha Pix e escaneie o código.
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element -- base64 do Asaas, não uma URL que o Next possa otimizar */}
                  <img
                    src={`data:image/png;base64,${dados.pix.encodedImage}`}
                    alt="QR Code do Pix"
                    className="mt-3 h-52 w-52 border border-line bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => copiar(dados.pix!.payload)}
                    className="btn-secondary mt-3 !px-5 !py-3 text-[11px]"
                  >
                    {copiado ? 'Código copiado!' : 'Copiar código Pix'}
                  </button>
                </div>
              )}

              {dados.asaasInvoiceUrl && (
                <div className={dados.pix ? 'border-t border-line pt-4' : ''}>
                  <p className="text-sm font-semibold">
                    {dados.pix ? 'Prefere outra forma?' : 'Concluir pagamento'}
                  </p>
                  <p className="mt-1 text-sm text-ink/60">
                    Na página de pagamento você escolhe entre Pix, cartão ou boleto.
                  </p>
                  <a
                    href={dados.asaasInvoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary mt-3 inline-flex !px-6 !py-3 text-[11px]"
                  >
                    Escolher forma de pagamento
                  </a>
                </div>
              )}

              {!dados.pix && !dados.asaasInvoiceUrl && (
                <p className="text-sm text-ink/70">
                  Não encontramos um pagamento em aberto para este pedido. Fale com a gente pelo
                  WhatsApp que a gente resolve.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
