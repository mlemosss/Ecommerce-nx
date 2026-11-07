-- Data de entrega confirmada pela transportadora. O pedido de avaliacao passa a
-- contar dela, e nao da postagem. Coluna nula e aditiva: nada a preencher.
ALTER TABLE "orders" ADD COLUMN     "deliveredAt" TIMESTAMP(3);
