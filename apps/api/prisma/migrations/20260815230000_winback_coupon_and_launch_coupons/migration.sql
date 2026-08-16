-- AlterTable: cupom oferecido no e-mail de boleto vencido.
ALTER TABLE "store_settings" ADD COLUMN     "winbackCouponCode" TEXT;
ALTER TABLE "store_settings" ADD COLUMN     "winbackCouponPercent" INTEGER NOT NULL DEFAULT 0;

-- Aponta o e-mail de recuperação para o cupom VOLTEI5, criado logo abaixo.
UPDATE "store_settings"
   SET "winbackCouponCode" = 'VOLTEI5',
       "winbackCouponPercent" = 5
 WHERE "id" = 'singleton';

-- Os dois cupons anunciados na loja, criados já ativos.
--
-- Normalmente cupom é dado do lojista e nasce pelo painel. Estes dois vêm por
-- migração porque já estão anunciados no site — PRIMEIRACOMPRA10 na faixa da
-- home e VOLTEI5 no e-mail de boleto vencido — e código anunciado que não
-- existe faz o cliente digitar e levar "cupom inválido".
--
-- ON CONFLICT DO NOTHING: se o lojista já tiver criado um deles à mão, o dele
-- vale e esta migração não encosta.
INSERT INTO "coupons" (
  "id", "code", "discountType", "discountValue", "minOrderValue",
  "usageLimit", "usageCount", "firstPurchaseOnly", "active",
  "startsAt", "expiresAt", "createdAt", "updatedAt"
) VALUES
  (
    'cpn_primeiracompra10', 'PRIMEIRACOMPRA10', 'percentage', 10, NULL,
    -- Sem limite global: o teto é por CPF, garantido pelo firstPurchaseOnly.
    NULL, 0, true, true,
    NULL, NULL, NOW(), NOW()
  ),
  (
    'cpn_voltei5', 'VOLTEI5', 'percentage', 5, NULL,
    -- Também sem limite global: quem recebe é quem teve boleto vencido, e o
    -- e-mail já é o filtro. Vale para quem já comprou, então não é de estreia.
    NULL, 0, false, true,
    NULL, NULL, NOW(), NOW()
  )
ON CONFLICT ("code") DO NOTHING;
