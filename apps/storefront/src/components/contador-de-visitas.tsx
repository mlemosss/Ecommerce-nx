'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { canalDaVisita, registrarOrigem } from '../lib/atribuicao';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

/** Marca que esta aba já foi contada como uma visita. */
const CHAVE_DE_SESSAO = 'no-excuse:sessao';

/**
 * Conta as visitas da loja, sem saber quem visitou.
 *
 * Existia Clarity, Pixel e GTM — e nenhum deles responde, dentro do painel, a
 * pergunta que a lojista faz: "quantas pessoas entraram hoje e quantas
 * compraram". Para saber isso ela teria que abrir três sites de terceiros e
 * juntar os números na cabeça.
 *
 * O que sobe daqui é o caminho da página e um sinal de "primeira página desta
 * aba". Sem id, sem cookie, sem IP, sem nada que ligue uma visita a uma pessoa
 * — por isso não depende do aceite de cookies: não há o que consentir quando
 * não se guarda nada sobre ninguém.
 *
 * `sessionStorage` some ao fechar a aba, e é o mais honesto que dá para chegar
 * de "quantas pessoas" sem rastrear ninguém.
 */
export function ContadorDeVisitas() {
  const pathname = usePathname();
  const ultimaRota = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    // O App Router roda o efeito de novo em coisas que não são navegação;
    // contar a mesma rota duas vezes seguidas infla o número à toa.
    if (ultimaRota.current === pathname) return;
    ultimaRota.current = pathname;

    // O painel não é loja: contar as visitas da lojista ao próprio site
    // estragaria justamente o número que ela usa para decidir.
    if (pathname.startsWith('/admin')) return;

    // De onde ela veio. Registrado aqui porque este componente já roda na
    // primeira página de toda visita — e a origem só existe na primeira, antes
    // de a navegação apagar a query da URL.
    registrarOrigem();

    let novaSessao = false;
    try {
      if (!window.sessionStorage.getItem(CHAVE_DE_SESSAO)) {
        window.sessionStorage.setItem(CHAVE_DE_SESSAO, '1');
        novaSessao = true;
      }
    } catch {
      // Navegador com armazenamento bloqueado: conta a visualização e não a
      // sessão. Melhor um número certo e outro faltando do que nenhum.
    }

    const corpo = JSON.stringify({ rota: pathname, novaSessao, canal: canalDaVisita() });

    // `keepalive` para a contagem sobreviver a quem clica e sai na mesma hora —
    // que é exatamente a visita que mais interessa medir.
    fetch(`${API_URL}/metrics/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: corpo,
      keepalive: true,
    }).catch(() => {
      // Contador não pode atrapalhar a loja. Visita perdida não muda decisão.
    });
  }, [pathname]);

  return null;
}
