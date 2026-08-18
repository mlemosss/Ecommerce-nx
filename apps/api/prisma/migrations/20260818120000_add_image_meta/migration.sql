-- Hash e extensao de cada foto, para montar a URL publica sem ler a foto.
-- Sem isso, toda leitura do catalogo arrastava as imagens em base64 para fora
-- do Postgres: ~3,7 MB por chamada, que queimaram os 5 GB de transferencia do
-- plano em 18 dias e suspenderam o banco.
-- NULL = ainda nao calculado (diferente de "[]" = produto sem foto).
ALTER TABLE "products" ADD COLUMN     "imageMeta" TEXT;
