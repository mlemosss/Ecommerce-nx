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
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
