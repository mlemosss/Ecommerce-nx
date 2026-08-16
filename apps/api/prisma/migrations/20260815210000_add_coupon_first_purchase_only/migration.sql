-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "firstPurchaseOnly" BOOLEAN NOT NULL DEFAULT false;

-- Padrão `false`: os cupons que já existem continuam se comportando como antes.
-- Só o cupom de estreia é marcado, e aí passa a valer uma vez por CPF.
