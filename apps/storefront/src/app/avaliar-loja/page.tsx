import type { Metadata } from 'next';
import { AvaliarLojaForm } from '../../components/avaliar-loja-form';

export const metadata: Metadata = {
  title: 'Avaliar a NO EXCUSE',
  description:
    'Conte como foi sua experiência com a NO EXCUSE. Sua avaliação ajuda outras mulheres a escolherem a peça certa.',
  // Fora do índice: é uma página de formulário, não conteúdo de busca. O que
  // interessa ao Google são as avaliações aprovadas na home, não o formulário.
  robots: { index: false, follow: true },
};

export default function AvaliarLojaPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="eyebrow text-ink/50">Sua opinião</p>
      <h1 className="page-title mt-3">Conte como foi</h1>
      <p className="mt-5 text-sm leading-relaxed text-ink/70">
        Se você já usou uma peça NO EXCUSE — comprada aqui no site ou direto com a gente, antes de
        ele existir — sua avaliação vale muito. É o que ajuda quem está em dúvida no tamanho, no
        caimento ou em confiar numa marca que ainda não conhece.
      </p>

      <div className="mt-12">
        <AvaliarLojaForm />
      </div>
    </main>
  );
}
