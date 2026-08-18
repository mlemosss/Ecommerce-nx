import Link from 'next/link';
import { getSettings } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { JsonLd } from '../../components/json-ld';
import { faqSchema } from '../../lib/structured-data';
import { DIAS_DE_ARREPENDIMENTO } from '../../lib/structured-data';

export const metadata = {
  alternates: { canonical: '/perguntas-frequentes' },
  title: 'Perguntas frequentes — NO EXCUSE',
  description:
    'Tamanho, frete, prazo, formas de pagamento, troca e devolução: as dúvidas mais comuns de quem compra na NO EXCUSE.',
};

/**
 * As perguntas que a loja mais recebe.
 *
 * A ordem não é temática — é a ordem em que a dúvida aparece na cabeça de quem
 * está comprando. Tamanho primeiro, porque é o que trava a compra de roupa
 * pela internet; forma de pagamento e troca por último, porque são as
 * perguntas de quem já decidiu e só quer segurança para clicar.
 *
 * Cada resposta é curta de propósito. FAQ que precisa ser lida inteira não é
 * FAQ, é manual — e quem está com dúvida no meio da compra não lê manual.
 */
function perguntas(freteGratis: number, parcelas: number) {
  return [
    {
      pergunta: 'Como sei qual tamanho comprar?',
      resposta:
        'Cada peça tem o botão "Tabela de medidas" logo acima dos tamanhos. Você mede cintura e quadril com uma fita métrica e a tabela indica o tamanho certo. Se ficar entre dois, chame a gente no WhatsApp com as suas medidas que a gente diz qual pegar.',
    },
    {
      pergunta: 'Quanto custa o frete e em quanto tempo chega?',
      resposta: `O frete é calculado pelo seu CEP no momento da compra, com o prazo de cada transportadora aparecendo na hora — você escolhe entre as opções. Acima de ${formatPrice(
        freteGratis
      )} o frete é grátis para todo o Brasil.`,
    },
    {
      pergunta: 'Quais são as formas de pagamento?',
      resposta: `Pix, que confirma na hora, boleto, ou cartão de crédito em até ${parcelas}x sem juros. O pagamento é feito no site, na tela de finalização do pedido.`,
    },
    {
      pergunta: 'E se não servir? Posso trocar?',
      resposta: `Pode. Você tem ${DIAS_DE_ARREPENDIMENTO} dias corridos, contados do recebimento, para trocar ou devolver sem precisar dar motivo — é o direito de arrependimento do Código de Defesa do Consumidor. Devolvemos o valor inteiro, e o frete da volta é por nossa conta. A peça precisa estar sem uso e com a etiqueta.`,
    },
    {
      pergunta: 'A legging fica transparente no agachamento?',
      resposta:
        'Não. Provamos cada modelo antes de colocar na loja, e o agachamento é justamente o teste que a gente faz. As peças têm compressão média a alta e tecido de gramatura suficiente para não abrir.',
    },
    {
      pergunta: 'Como acompanho meu pedido?',
      resposta:
        'Assim que o pedido é postado, você recebe o código de rastreio por e-mail. Também dá para ver o status a qualquer momento em Minha conta, na seção Meus pedidos.',
    },
    {
      pergunta: 'Fiz o pedido no Pix mas não paguei na hora. Perdi?',
      resposta:
        'Não. Entre em Minha conta, abra o pedido em Meus pedidos e clique em "Pagar este pedido" — o QR Code é gerado de novo na hora, e você também pode trocar para boleto ou cartão. O pedido fica guardado.',
    },
    {
      pergunta: 'Como uso o cupom de desconto?',
      resposta:
        'No carrinho, antes de finalizar, tem um campo para o código. Na primeira compra vale o PRIMEIRACOMPRA10, que dá 10% de desconto. O cupom é por CPF e só na estreia.',
    },
    {
      pergunta: 'O tamanho que eu quero está esgotado. O que faço?',
      resposta:
        'Clique no tamanho mesmo assim e deixe seu e-mail em "Avise-me quando chegar". Você é avisada assim que ele voltar — e, mais importante, é assim que a gente descobre qual tamanho mandar produzir primeiro.',
    },
    {
      pergunta: 'Como lavo as peças?',
      resposta:
        'À mão ou na máquina em ciclo delicado, com água fria e do avesso. Não use amaciante: ele fecha os poros do tecido e tira a respirabilidade. Seque à sombra e nunca na secadora — o calor mata a elasticidade.',
    },
    {
      pergunta: 'A loja é segura? Quem está por trás?',
      resposta:
        'Somos a NO EXCUSE, CNPJ 51.141.534/0001-79, de São Paulo. A marca foi criada por duas mulheres: uma personal trainer e professora de educação física, e uma professora e empreendedora. O pagamento é processado pelo Asaas, e o site tem certificado de segurança.',
    },
    {
      pergunta: 'Vocês têm loja física?',
      resposta:
        'Não temos loja aberta ao público. Somos de São Paulo e nosso estoque fica em Higienópolis. Toda a venda é pelo site, com envio para todo o Brasil.',
    },
  ];
}

export default async function FaqPage() {
  const settings = await getSettings();
  const lista = perguntas(settings.freeShippingThreshold, settings.maxInstallments);
  const whatsapp = settings.contactWhatsapp?.replace(/\D/g, '');

  return (
    <div className="container-page py-14 sm:py-16">
      {/* O mesmo texto que está na tela, para o Google poder mostrar as
          perguntas abertas embaixo do link na busca. */}
      <JsonLd data={faqSchema(lista.map((p) => ({ pergunta: p.pergunta, resposta: p.resposta })))} />

      <p className="eyebrow text-ink/50">Ajuda</p>
      <h1 className="section-title mt-3">Perguntas frequentes</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/60">
        As dúvidas que mais recebem resposta no nosso WhatsApp. Se a sua não estiver aqui, é só
        chamar a gente.
      </p>

      {/* `details` nativo: abre e fecha sem JavaScript, funciona com leitor de
          tela e o conteúdo fica no HTML — que é o que o Google precisa ler. */}
      <div className="mt-10 max-w-2xl border-t border-line">
        {lista.map((item) => (
          <details key={item.pergunta} className="group border-b border-line">
            <summary className="flex cursor-pointer items-center justify-between gap-4 py-5 text-sm font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
              {item.pergunta}
              <span
                aria-hidden
                className="shrink-0 text-lg font-normal text-ink/40 transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="pb-5 pr-8 text-sm leading-relaxed text-ink/70">{item.resposta}</p>
          </details>
        ))}
      </div>

      <div className="mt-12 max-w-2xl bg-paper p-6">
        <p className="text-sm font-semibold">Não achou sua dúvida?</p>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          Chame a gente no WhatsApp. Respondemos de segunda a sexta, das 9h às 18h.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                'Oi! Tenho uma dúvida que não achei nas perguntas frequentes.'
              )}`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              Falar no WhatsApp
            </a>
          )}
          <Link href="/trocas-e-devolucoes" className="link-ghost text-xs">
            Política de trocas
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
