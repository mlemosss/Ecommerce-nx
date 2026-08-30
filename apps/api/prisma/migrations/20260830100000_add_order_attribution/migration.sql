-- De onde veio cada venda.
--
-- O painel do Meta diz quantas vendas ele acha que trouxe, e o do Google diz o
-- mesmo. Os dois contam a mesma venda, e os dois contam a mais. Sem registro
-- proprio, a lojista soma dois numeros inflados e decide orcamento em ficcao.
ALTER TABLE "orders" ADD COLUMN     "utmSource" TEXT;
ALTER TABLE "orders" ADD COLUMN     "utmMedium" TEXT;
ALTER TABLE "orders" ADD COLUMN     "utmCampaign" TEXT;
ALTER TABLE "orders" ADD COLUMN     "utmContent" TEXT;
ALTER TABLE "orders" ADD COLUMN     "utmTerm" TEXT;
ALTER TABLE "orders" ADD COLUMN     "gclid" TEXT;
ALTER TABLE "orders" ADD COLUMN     "referrer" TEXT;
ALTER TABLE "orders" ADD COLUMN     "landingPage" TEXT;

-- O relatorio de origem filtra por data e agrupa por campanha.
CREATE INDEX "orders_createdAt_utmSource_idx" ON "orders"("createdAt", "utmSource");
