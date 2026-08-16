-- Token do link de avaliação, por pedido.
ALTER TABLE "orders" ADD COLUMN     "reviewToken" TEXT;
CREATE UNIQUE INDEX "orders_reviewToken_key" ON "orders"("reviewToken");

-- De qual pedido veio a avaliação. Nulo nas que já existem e nas que vierem
-- pela conta do cliente, que continua funcionando.
ALTER TABLE "product_reviews" ADD COLUMN     "orderId" TEXT;

-- Uma avaliação por produto por pedido. O índice aceita vários NULL em
-- Postgres, então as avaliações antigas e as feitas por conta não se estorvam.
CREATE UNIQUE INDEX "product_reviews_orderId_productId_key"
    ON "product_reviews"("orderId", "productId");

-- Os pedidos que já existem ganham token agora, para a lojista poder mandar o
-- link de avaliação de quem já comprou. gen_random_uuid() vem do pgcrypto, que
-- o Postgres 13+ traz embutido.
UPDATE "orders"
   SET "reviewToken" = replace(gen_random_uuid()::text, '-', '')
 WHERE "reviewToken" IS NULL;
