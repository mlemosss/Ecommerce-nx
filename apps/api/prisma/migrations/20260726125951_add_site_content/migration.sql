-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN     "heroPrimaryButtonLabel" TEXT NOT NULL DEFAULT 'Ver produtos',
ADD COLUMN     "heroSecondaryButtonLabel" TEXT NOT NULL DEFAULT 'Explorar leggings',
ADD COLUMN     "heroSubtitle" TEXT NOT NULL DEFAULT 'Roupas de academia pensadas para quem treina de verdade: compressão certa, respirabilidade e caimento que acompanham cada repetição.',
ADD COLUMN     "heroTag" TEXT NOT NULL DEFAULT 'Nova coleção',
ADD COLUMN     "heroTitleHighlight" TEXT NOT NULL DEFAULT 'limites.',
ADD COLUMN     "heroTitleLine1" TEXT NOT NULL DEFAULT 'Treine sem',
ADD COLUMN     "newsletterSubtitle" TEXT NOT NULL DEFAULT 'Cadastre seu e-mail e receba um cupom exclusivo, além de novidades de lançamentos.',
ADD COLUMN     "newsletterTitle" TEXT NOT NULL DEFAULT 'Ganhe 10% na primeira compra',
ADD COLUMN     "valueProps" TEXT NOT NULL DEFAULT '[{"title":"Troca grátis em 30 dias","description":"Não serviu ou não gostou? Trocamos sem burocracia."},{"title":"Entrega para todo o Brasil","description":"Envio rastreado com prazos exibidos no checkout."},{"title":"Tecido testado em treino real","description":"Compressão, respirabilidade e durabilidade validadas por atletas."},{"title":"Pagamento seguro","description":"Pix, cartão em até 3x sem juros ou boleto."}]';
