import { notFound } from 'next/navigation';
import { getReviewLink } from '../../../lib/api';
import { ReviewLinkForm } from '../../../components/review-link-form';

export const metadata = {
  title: 'Avaliar compra — NO EXCUSE',
  /**
   * A página traz o primeiro nome de quem comprou e o número do pedido. Não é
   * dado sensível, mas também não tem por que estar no Google — e não serve a
   * ninguém além de quem recebeu o link.
   */
  robots: { index: false, follow: false },
};

export default async function AvaliarPage({ params }: { params: { token: string } }) {
  const dados = await getReviewLink(params.token);
  if (!dados) notFound();

  return (
    <div className="container-page max-w-2xl py-14 sm:py-20">
      <p className="eyebrow text-ink/50">Pedido #{dados.orderNumber}</p>
      <h1 className="section-title mt-3">
        {dados.firstName ? `${dados.firstName}, o que você achou?` : 'O que você achou?'}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink/65">
        Sua opinião ajuda quem está em dúvida sobre tamanho e caimento — que é a dúvida de quase
        todo mundo. Se quiser, mande uma foto usando: é o que mais ajuda a próxima cliente a
        decidir.
      </p>

      <div className="mt-10 space-y-8">
        {dados.produtos.map((p) => (
          <ReviewLinkForm key={p.productId} token={params.token} produto={p} />
        ))}
      </div>

      <p className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-ink/45">
        Sua avaliação aparece na página do produto com o seu primeiro nome, depois de conferida
        pela loja. Você pode voltar neste link e mudar o que escreveu.
      </p>
    </div>
  );
}
