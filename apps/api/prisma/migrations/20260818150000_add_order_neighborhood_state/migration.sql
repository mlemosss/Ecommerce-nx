-- Bairro e UF do pedido. Sem os dois nao se emite etiqueta dos Correios,
-- e ate agora eles nunca foram perguntados no checkout.
ALTER TABLE "orders" ADD COLUMN     "neighborhood" TEXT;
ALTER TABLE "orders" ADD COLUMN     "state" TEXT;
