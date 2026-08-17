-- Identificadores de clique da Meta (_fbp e _fbc), guardados no pedido.
-- O Purchase da API de Conversões sai depois do checkout, quando não há mais
-- requisição do navegador para ler os cookies.
ALTER TABLE "orders" ADD COLUMN     "metaFbp" TEXT;
ALTER TABLE "orders" ADD COLUMN     "metaFbc" TEXT;
