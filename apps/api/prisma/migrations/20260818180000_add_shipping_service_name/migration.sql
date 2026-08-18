-- Nome da transportadora escolhida. O id sozinho nao diz onde postar,
-- que e a pergunta seguinte a imprimir a etiqueta.
ALTER TABLE "orders" ADD COLUMN     "shippingServiceName" TEXT;
