-- Identificação da empresa no rodapé, exigida pelo CDC em loja virtual.
-- Nulos de propósito: CNPJ de exemplo é pior do que CNPJ nenhum.
ALTER TABLE "store_settings" ADD COLUMN     "legalName" TEXT;
ALTER TABLE "store_settings" ADD COLUMN     "cnpj" TEXT;

-- O padrão do nome da loja acompanha a marca em caixa alta. Só afeta uma
-- instalação nova; o valor já gravado continua como está.
ALTER TABLE "store_settings" ALTER COLUMN "storeName" SET DEFAULT 'NO EXCUSE';
