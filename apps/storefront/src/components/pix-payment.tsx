'use client';

import { useEffect, useState } from 'react';

interface PixData {
  encodedImage: string;
  payload: string;
  expirationDate?: string;
}

const STORAGE_KEY = 'no-excuse:pix';

/**
 * QR Code do Pix na própria loja.
 *
 * O checkout guarda os dados na sessão da aba porque a imagem em base64 não
 * cabe na URL. Se não houver nada guardado (aba nova, link compartilhado), o
 * componente some e o link da fatura do Asaas continua valendo como saída.
 */
export function PixPayment() {
  const [pix, setPix] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) setPix(JSON.parse(stored) as PixData);
    } catch {
      setPix(null);
    }
  }, []);

  if (!pix) return null;

  async function copy() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="w-full max-w-md border border-line bg-paper p-6 text-left">
      <p className="eyebrow text-ink/50">Pague com Pix</p>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        Abra o app do seu banco, escolha Pix e aponte a câmera para o código. A confirmação é
        automática.
      </p>

      <div className="mt-5 flex justify-center bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${pix.encodedImage}`}
          alt="QR Code do Pix"
          className="h-56 w-56"
        />
      </div>

      <p className="eyebrow mt-6 text-ink/50">Ou use o copia e cola</p>
      <p className="mt-2 break-all border border-ink/15 bg-white p-3 font-mono text-[11px] leading-relaxed text-ink/75">
        {pix.payload}
      </p>
      <button type="button" onClick={copy} className="btn-primary mt-3 w-full">
        {copied ? 'Código copiado' : 'Copiar código'}
      </button>

      <p className="mt-4 text-xs leading-relaxed text-ink/60">
        Assim que o pagamento cair, seu pedido é confirmado automaticamente e você recebe um
        e-mail. Não precisa enviar comprovante.
      </p>
    </div>
  );
}
