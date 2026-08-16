-- Cupom oferecido no e-mail de agradecimento de quem pediu aviso de reposição.
ALTER TABLE "store_settings" ADD COLUMN     "stockAlertCouponCode" TEXT;
ALTER TABLE "store_settings" ADD COLUMN     "stockAlertCouponPercent" INTEGER NOT NULL DEFAULT 0;

UPDATE "store_settings"
   SET "stockAlertCouponCode" = 'COMPRE10',
       "stockAlertCouponPercent" = 10
 WHERE "id" = 'singleton';

-- COMPRE10, criado já ativo.
--
-- Diferente do PRIMEIRACOMPRA10, este NÃO é de estreia: quem pediu aviso pode
-- já ter comprado antes, e recusar o cupom bem na hora em que a pessoa voltou
-- seria o oposto do que o e-mail se propõe.
--
-- Sem limite global de usos: o e-mail é o filtro — só recebe quem deixou o
-- endereço numa peça sem estoque. Um teto aqui seria queimável por quem
-- descobrisse o código.
INSERT INTO "coupons" (
  "id", "code", "discountType", "discountValue", "minOrderValue",
  "usageLimit", "usageCount", "firstPurchaseOnly", "active",
  "startsAt", "expiresAt", "createdAt", "updatedAt"
) VALUES (
  'cpn_compre10', 'COMPRE10', 'percentage', 10, NULL,
  NULL, 0, false, true,
  NULL, NULL, NOW(), NOW()
)
ON CONFLICT ("code") DO NOTHING;
