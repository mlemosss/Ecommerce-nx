import Link from 'next/link';
import { getSettings } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { DIAS_DE_ARREPENDIMENTO } from '../../lib/structured-data';

export const metadata = {
  alternates: { canonical: '/trocas-e-devolucoes' },
  title: 'Trocas e devoluções — NO EXCUSE',
  description:
    'Como trocar ou devolver uma peça da NO EXCUSE: prazo, quem paga o frete e como pedir.',
};

/**
 * Política de trocas e devoluções.
 *
 * O rodapé não trazia nenhuma, e o Decreto 7.962/2013 exige que as condições da
 * compra fiquem acessíveis antes de fechar o pedido. Faltava também para o
 * Google: sem política declarada, a peça entra na busca com aviso de dado
 * ausente e é reprovada nas listagens gratuitas do Shopping.
 *
 * O que está escrito aqui é o piso da lei, não uma promessa a mais: sete dias
 * de arrependimento pelo art. 49 do CDC, com frete de volta por conta da loja.
 * Prazo maior é decisão da lojista — e aí esta página muda junto.
 */
export default async function TrocasPage() {
  const settings = await getSettings();
  const whatsapp = settings.contactWhatsapp?.replace(/\D/g, '');

  return (
    <div className="container-page py-14 sm:py-16">
      <p className="eyebrow text-ink/50">Ajuda</p>
      <h1 className="section-title mt-3">Trocas e devoluções</h1>

      <div className="mt-10 max-w-2xl space-y-10">
        <section>
          <h2 className="text-sm font-bold uppercase tracking-[0.14em]">
            Mudou de ideia? {DIAS_DE_ARREPENDIMENTO} dias
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Você tem <strong>{DIAS_DE_ARREPENDIMENTO} dias corridos, contados do recebimento</strong>,
            para desistir da compra sem precisar dar motivo. É o direito de arrependimento do artigo
            49 do Código de Defesa do Consumidor, e vale para tudo que você comprou pela internet.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Devolvemos <strong>o valor inteiro</strong>, incluindo o frete que você pagou. O envio de
            volta é <strong>por nossa conta</strong> — a gente manda o código de postagem.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-[0.14em]">Não serviu?</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Trocamos por outro tamanho ou outra cor, dentro do mesmo prazo, desde que a peça esteja
            sem uso e com a etiqueta. Roupa fitness é peça íntima: por higiene, só conseguimos
            aceitar de volta o que não foi usado.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Antes de comprar, vale conferir a tabela de medidas na página da peça — ela é o jeito
            mais rápido de acertar o tamanho de primeira.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-[0.14em]">Peça com defeito</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Costura, tecido ou qualquer defeito de fabricação: você tem <strong>90 dias</strong> a
            partir do recebimento, pelo artigo 26 do CDC. Trocamos ou devolvemos o valor, como você
            preferir, e o frete é sempre nosso.
          </p>
        </section>

        {/* O prazo do estorno é a pergunta que mais chega depois de uma
            devolução, e ela chega três vezes: no terceiro dia, no quinto e no
            oitavo. Dizer antes transforma três mensagens em nenhuma — e o
            número é do banco emissor, não nosso, então prometer menos seria
            prometer o que não depende da gente. */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-[0.14em]">
            Quando o dinheiro volta
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Assim que a devolução é aprovada, o estorno é feito no mesmo dia. No{' '}
            <strong>cartão de crédito</strong>, o valor pode levar{' '}
            <strong>até 10 dias úteis</strong> para aparecer na fatura — o prazo é do banco emissor,
            e dependendo da data de fechamento pode entrar como crédito na fatura seguinte. No{' '}
            <strong>Pix</strong>, volta para a mesma conta, normalmente em até um dia útil.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Compra parcelada é estornada inteira, de uma vez — você não continua pagando parcelas de
            uma peça devolvida.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-[0.14em]">Como pedir</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Chame a gente no WhatsApp com o número do pedido e uma foto da peça. Respondemos com o
            código de postagem e o passo seguinte. Não precisa preencher formulário nenhum.
          </p>
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                'Oi! Preciso trocar/devolver uma peça. Meu pedido é o número '
              )}`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary mt-5 inline-flex"
            >
              Falar no WhatsApp
            </a>
          )}
        </section>

        <section className="border-t border-line pt-8">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em]">Frete</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Frete grátis nas compras a partir de{' '}
            <strong>{formatPrice(settings.freeShippingThreshold)}</strong>. Abaixo disso o valor é
            calculado pelo seu CEP no checkout, com o prazo de cada transportadora.
          </p>
        </section>

        <p className="text-sm text-ink/60">
          Ficou alguma dúvida?{' '}
          <Link href="/quem-somos" className="underline underline-offset-4">
            Conheça quem está do outro lado
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
