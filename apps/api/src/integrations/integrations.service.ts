import { Injectable } from '@nestjs/common';

interface PendingIntegration {
  key: string;
  name: string;
  codeReady: boolean;
  configured: boolean;
  missingEnvVars: string[];
  instructions: string[];
  envExample: string;
}

function hasEnv(name: string): boolean {
  return Boolean(process.env[name] && process.env[name]!.trim().length > 0);
}

function missing(names: string[]): string[] {
  return names.filter((n) => !hasEnv(n));
}

@Injectable()
export class IntegrationsService {
  listPending(): PendingIntegration[] {
    const asaasVars = ['ASAAS_API_KEY', 'ASAAS_ENV', 'ASAAS_WEBHOOK_TOKEN'];
    const shopeeVars = ['SHOPEE_PARTNER_ID', 'SHOPEE_PARTNER_KEY', 'SHOPEE_ENV', 'API_PUBLIC_URL', 'ADMIN_PUBLIC_URL'];
    const metaVars = ['META_ACCESS_TOKEN', 'META_CATALOG_ID'];

    return [
      {
        key: 'asaas',
        name: 'Asaas — confirmação de pagamento (Pix/cartão/boleto)',
        codeReady: true,
        configured: missing(asaasVars).length === 0,
        missingEnvVars: missing(asaasVars),
        instructions: [
          'Crie (ou acesse) sua conta em asaas.com e pegue a API Key em Configurações > Integrações > API Key.',
          'Cadastre um webhook em Configurações > Integrações > Webhooks apontando para https://noexcuse-api.vercel.app/api/webhooks/asaas, com um token de sua escolha.',
          'Me envie a API Key, se é sandbox ou produção, e o token do webhook que você cadastrou — eu configuro as variáveis na Vercel.',
        ],
        envExample: 'ASAAS_API_KEY=sua_chave_aqui\nASAAS_ENV=production\nASAAS_WEBHOOK_TOKEN=um_token_qualquer_que_voce_escolher',
      },
      {
        key: 'shopee',
        name: 'Shopee — anunciar produtos',
        codeReady: true,
        configured: missing(shopeeVars).length === 0,
        missingEnvVars: missing(shopeeVars),
        instructions: [
          'Crie uma conta de desenvolvedor em open.shopee.com e registre um app pra obter Partner ID e Partner Key.',
          'Me envie o Partner ID e o Partner Key — eu configuro as variáveis na Vercel.',
          'Depois de configurado, entre em Gerencial > Shopee no admin e clique em "Conectar com Shopee" pra autorizar com a conta da sua loja.',
        ],
        envExample:
          'SHOPEE_PARTNER_ID=seu_partner_id\nSHOPEE_PARTNER_KEY=sua_partner_key\nSHOPEE_ENV=live\nAPI_PUBLIC_URL=https://noexcuse-api.vercel.app/api\nADMIN_PUBLIC_URL=https://ecommerce-nx-admin-j76r.vercel.app/admin',
      },
      {
        key: 'meta',
        name: 'Meta (Facebook/Instagram) — catálogo de produtos',
        codeReady: true,
        configured: missing(metaVars).length === 0,
        missingEnvVars: missing(metaVars),
        instructions: [
          'No Meta Commerce Manager, crie um catálogo e copie o Catalog ID.',
          'Gere um Access Token com permissão de catálogo (via Meta Business Suite ou um app no developers.facebook.com).',
          'Me envie o Catalog ID e o Access Token — eu configuro as variáveis na Vercel.',
        ],
        envExample: 'META_ACCESS_TOKEN=seu_token_aqui\nMETA_CATALOG_ID=seu_catalog_id',
      },
      {
        key: 'resend',
        name: 'E-mails automáticos (pedido, pagamento, envio, carrinho, avaliação) — Resend',
        codeReady: true,
        configured: hasEnv('RESEND_API_KEY'),
        missingEnvVars: hasEnv('RESEND_API_KEY') ? [] : ['RESEND_API_KEY'],
        instructions: [
          'Crie uma conta em resend.com e verifique o domínio de e-mail da loja (ou use o domínio de testes deles pra começar).',
          'Gere uma API Key em resend.com/api-keys.',
          'Me envie a API Key — eu configuro a variável na Vercel e os 5 e-mails automáticos (já implementados em Gerencial > Fluxo de e-mails) passam a ser enviados de verdade.',
        ],
        envExample: 'RESEND_API_KEY=sua_chave_aqui',
      },
      {
        key: 'focus-nfe',
        name: 'Nota fiscal automática — Focus NFe',
        codeReady: false,
        configured: hasEnv('FOCUS_NFE_TOKEN'),
        missingEnvVars: hasEnv('FOCUS_NFE_TOKEN') ? [] : ['FOCUS_NFE_TOKEN'],
        instructions: [
          'Crie uma conta em focusnfe.com.br e contrate o plano adequado ao seu volume de vendas.',
          'Cadastre sua empresa e o certificado digital A1 no painel da Focus NFe.',
          'Pegue o token de acesso (sandbox pra testar, produção depois) em Configurações > Token de acesso.',
          'Me envie o token — eu construo a emissão automática de nota ao concluir uma venda e configuro a variável.',
        ],
        envExample: 'FOCUS_NFE_TOKEN=seu_token_aqui\nFOCUS_NFE_ENV=production',
      },
      {
        key: 'melhor-envio',
        name: 'Etiqueta de envio automática — Melhor Envio',
        codeReady: false,
        configured: hasEnv('MELHOR_ENVIO_TOKEN'),
        missingEnvVars: hasEnv('MELHOR_ENVIO_TOKEN') ? [] : ['MELHOR_ENVIO_TOKEN'],
        instructions: [
          'Crie uma conta em melhorenvio.com.br e cadastre o endereço de origem (de onde os pacotes saem).',
          'Cadastre uma aplicação em Painel > Integrações > Gerar novo token, ou gere um token direto pra uso próprio.',
          'Me envie o token — eu construo a geração automática de etiqueta e o campo de rastreio no admin, e configuro a variável.',
        ],
        envExample: 'MELHOR_ENVIO_TOKEN=seu_token_aqui\nMELHOR_ENVIO_ENV=production',
      },
    ];
  }
}
