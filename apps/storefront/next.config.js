//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');

// As fotos de produto agora são servidas pela API (URL com hash do conteúdo) em
// vez de virem embutidas em base64. next/image só carrega host declarado aqui.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://noexcuse-api.vercel.app/api';
let apiHostname = 'noexcuse-api.vercel.app';
try {
  apiHostname = new URL(apiUrl).hostname;
} catch {
  // URL inválida na env: fica o host de produção.
}

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {
    // Set this to true if you would like to use SVGR
    // See: https://github.com/gregberge/svgr
    svgr: false,
  },
  images: {
    // Só o host da própria API. Um curinga como '**.vercel.app' liberaria
    // qualquer deploy da Vercel — de qualquer pessoa — a ser servido pelo
    // /_next/image desta loja, que viraria proxy de imagem de terceiros.
    remotePatterns: [
      { protocol: 'https', hostname: apiHostname },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },

  /**
   * O feed do catálogo do Meta atendido pelo domínio da loja.
   *
   * O feed é gerado pela API, onde os produtos moram — gerar aqui obrigaria o
   * site a perguntar à API e montar tudo de novo, com duas cópias da mesma
   * regra de preço para divergirem. Isto é reescrita e não redirecionamento:
   * o Meta pede /api/meta-feed e recebe 200 com o CSV, sem pular de endereço.
   * Buscador de feed que não segue redirecionamento continua funcionando.
   */
  async rewrites() {
    return [{ source: '/api/meta-feed', destination: `${apiUrl}/meta/feed.csv` }];
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
