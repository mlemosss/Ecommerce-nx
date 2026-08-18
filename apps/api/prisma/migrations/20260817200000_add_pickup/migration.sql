-- Retirada em mãos, combinada depois da compra.
ALTER TABLE "orders" ADD COLUMN     "pickup" BOOLEAN NOT NULL DEFAULT false;
