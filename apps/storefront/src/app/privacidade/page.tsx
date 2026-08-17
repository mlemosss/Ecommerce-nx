import { getSettings } from '../../lib/api';
import { ConsentPreferences } from '../../components/consent-preferences';

export const metadata = {
  alternates: { canonical: '/privacidade' },
  title: 'Privacidade e cookies — NO EXCUSE',
  description: 'Como a NO EXCUSE trata seus dados pessoais e usa cookies.',
};

export default async function PrivacyPage() {
  const settings = await getSettings();
  const contato = settings.contactEmail;

  return (
    <div className="container-page max-w-3xl py-14 sm:py-20">
      <p className="eyebrow text-ink/50">Privacidade</p>
      <h1 className="section-title mt-3">Privacidade e cookies</h1>
      <p className="mt-4 text-sm text-ink/60">
        Última atualização: agosto de 2026. Esta página explica quais dados pessoais a loja coleta,
        para quê, com quem compartilha e como você exerce seus direitos.
      </p>

      <div className="mt-10 space-y-10">
        <Section title="Quem trata seus dados">
          <p>
            A loja NO EXCUSE é operada por Isabella e Layane. Para qualquer pedido relacionado aos
            seus dados pessoais — acesso, correção, exclusão ou dúvidas —, fale com a gente
            {contato ? (
              <>
                {' '}
                pelo e-mail{' '}
                <a href={`mailto:${contato}`} className="underline underline-offset-4">
                  {contato}
                </a>
                .
              </>
            ) : (
              ' pelos canais de contato informados no rodapé.'
            )}
          </p>
        </Section>

        <Section title="O que coletamos e por quê">
          <ul className="space-y-3">
            <Item label="Para processar seu pedido">
              Nome, e-mail, telefone, CPF e endereço de entrega. O CPF é exigido pelo meio de
              pagamento para emitir Pix, boleto ou cobrança no cartão.
            </Item>
            <Item label="Para entregar">
              Seu CEP é usado para calcular o frete; o endereço completo, para enviar o pacote.
            </Item>
            <Item label="Se você criar uma conta">
              Guardamos seu e-mail e uma versão criptografada da senha, além do histórico de
              pedidos e dos produtos que você favoritou.
            </Item>
            <Item label="Se você aceitar os cookies de medição">
              Dados de navegação na loja, usados para entender o que funciona e para mostrar nossos
              produtos em anúncios.
            </Item>
          </ul>
          <p className="mt-4">
            Dados do <strong>cartão de crédito</strong> não são guardados pela loja: eles são
            enviados por conexão segura direto para a processadora de pagamentos.
          </p>
        </Section>

        <Section title="Com quem compartilhamos">
          <ul className="space-y-3">
            <Item label="Asaas">Processamento dos pagamentos. Recebe nome, CPF, e-mail e telefone.</Item>
            <Item label="Melhor Envio">Cotação de frete. Recebe apenas o CEP — nenhum dado seu além disso.</Item>
            <Item label="Resend">Envio dos e-mails do pedido. Recebe seu e-mail e o conteúdo da mensagem.</Item>
            <Item label="Google e Meta">
              Somente se você aceitar os cookies de medição. Recebem dados de navegação para
              medição e anúncios — e, no caso da Meta, também os dados embaralhados descritos
              logo abaixo.
            </Item>
            <Item label="Vercel e Neon">Hospedagem do site e do banco de dados.</Item>
          </ul>
          <p className="mt-4">Não vendemos seus dados para ninguém.</p>
        </Section>

        {/* Exigência da LGPD e da própria Meta: enviar dado de cliente, mesmo
            embaralhado, precisa estar escrito aqui, com a base legal dita. Sem
            esta seção o envio não pode ser ligado. */}
        <Section title="Medição de anúncios pela Meta">
          <p>
            Se você aceitar os cookies de medição, enviamos à Meta — dona do Facebook e do
            Instagram — informações sobre a sua navegação na loja: as peças que você abriu, o que
            colocou no carrinho e as compras que finalizou.
          </p>
          <p className="mt-3">
            Junto com isso pode ir o seu <strong>e-mail e o seu telefone, embaralhados</strong> por
            um cálculo matemático chamado SHA-256. Embaralhado quer dizer que a Meta recebe uma
            sequência de letras e números da qual <strong>não é possível voltar</strong> ao seu
            e-mail ou ao seu telefone. Ela só consegue comparar essa sequência com a que já tem, para
            saber se você é a mesma pessoa que viu um anúncio nosso — e é só para isso que serve.
          </p>
          <p className="mt-3">
            <strong>Por que fazemos:</strong> sem essa comparação não temos como saber quais
            anúncios trazem venda de verdade. É a diferença entre gastar com o que funciona e gastar
            no escuro.
          </p>
          <p className="mt-3">
            <strong>Base legal:</strong> o seu consentimento, dado no aviso de cookies
            (art. 7º, I da LGPD). <strong>Nada disso acontece se você recusar</strong>, e você pode
            mudar de ideia quando quiser, no botão da seção seguinte. Ao revogar, o envio para de
            imediato.
          </p>
          <p className="mt-3">
            O envio é feito em parte pelo seu navegador e em parte pelo nosso servidor. É o mesmo
            dado nos dois caminhos; o segundo existe porque o primeiro se perde quando você usa
            bloqueador de anúncios ou a conexão falha.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            Cookies necessários mantêm o carrinho e a sua sessão funcionando — sem eles a loja não
            opera, e por isso não dependem de aceite.
          </p>
          <p className="mt-3">
            Cookies de medição e publicidade (Google e Meta) <strong>só são ativados se você
            aceitar</strong> no aviso que aparece na primeira visita. Se recusar, eles não carregam.
            Você pode mudar de ideia a qualquer momento:
          </p>
          <div className="mt-4">
            <ConsentPreferences />
          </div>
        </Section>

        <Section title="Por quanto tempo guardamos">
          <p>
            Dados de pedidos são mantidos pelo prazo exigido pela legislação fiscal e de defesa do
            consumidor. Dados de conta ficam enquanto a conta existir. Se você pedir a exclusão,
            apagamos o que não formos obrigados a guardar.
          </p>
        </Section>

        <Section title="Seus direitos">
          <p>
            A LGPD garante que você pode confirmar se tratamos seus dados, acessá-los, corrigi-los,
            pedir a exclusão, revogar consentimento e saber com quem compartilhamos.
            {contato ? (
              <>
                {' '}
                Escreva para{' '}
                <a href={`mailto:${contato}`} className="underline underline-offset-4">
                  {contato}
                </a>{' '}
                e respondemos.
              </>
            ) : (
              ' Fale com a gente pelos canais do rodapé.'
            )}
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-[0.14em]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink/75">{children}</div>
    </section>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="border-l-2 border-line pl-4">
      <span className="font-semibold text-ink">{label}:</span> {children}
    </li>
  );
}
