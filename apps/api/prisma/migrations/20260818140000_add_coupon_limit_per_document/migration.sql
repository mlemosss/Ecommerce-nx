-- Quantas vezes o mesmo CPF pode usar o cupom. Sem isso, um cupom de 10%
-- sem limite global e desconto permanente para quem descobrir o codigo.
ALTER TABLE "coupons" ADD COLUMN     "usageLimitPerDocument" INTEGER;
