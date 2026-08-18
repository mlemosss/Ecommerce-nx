'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CONSENT_EVENT, getConsent } from '../lib/cookie-consent';

const MENSAGEM_PADRAO = 'Oi! Vim pelo site da NO EXCUSE e queria tirar uma dúvida.';

/**
 * A mensagem já diz de qual peça ela está falando.
 *
 * Antes era sempre a mesma frase, e a conversa começava com a lojista
 * perguntando "qual peça?" — uma ida e volta em toda dúvida, justamente no
 * momento em que a cliente está decidindo. O nome sai do título da página, que
 * o Next já mantém certo a cada navegação; sem plumbing novo e sem o botão
 * precisar conhecer o catálogo.
 */
function mensagemDaPagina(caminho: string): string {
  if (!caminho.startsWith('/produtos/')) return MENSAGEM_PADRAO;

  // "Legging Energy — NO EXCUSE" vira "Legging Energy".
  const peca = document.title.split('—')[0]?.trim();
  if (!peca || peca.toUpperCase().includes('NO EXCUSE')) return MENSAGEM_PADRAO;

  return `Oi! Estou vendo a ${peca} no site e queria tirar uma dúvida.`;
}

/**
 * Atalho de WhatsApp fixo na tela.
 *
 * Antes o WhatsApp só existia no rodapé: quem tinha uma dúvida no meio da
 * página de produto — tamanho, prazo, o pagamento que não saiu — precisava
 * rolar até o fim para achar como perguntar. Aqui ele acompanha a rolagem.
 *
 * Sobe quando o aviso de cookies está aberto. O aviso é uma faixa colada no
 * rodapé da janela, e sem isso o botão ficava atrás dela justamente na
 * primeira visita, que é quando mais aparece dúvida.
 */
export function WhatsappButton({ phone }: { phone?: string | null }) {
  const [bannerAberto, setBannerAberto] = useState(false);
  // O titulo da pagina so existe no navegador, entao a mensagem e montada
  // depois da montagem — e refeita a cada troca de rota.
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO);
  const caminho = usePathname();

  useEffect(() => {
    const sync = () => setBannerAberto(getConsent() === null);
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  useEffect(() => {
    setMensagem(mensagemDaPagina(caminho));
  }, [caminho]);

  const digits = phone?.replace(/\D/g, '');
  if (!digits) return null;

  return (
    <a
      href={`https://wa.me/${digits}?text=${encodeURIComponent(mensagem)}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a gente no WhatsApp"
      className={`fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none motion-reduce:hover:scale-100 ${
        bannerAberto ? 'bottom-52 lg:bottom-28' : 'bottom-5'
      }`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-7 w-7">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
      </svg>
    </a>
  );
}
