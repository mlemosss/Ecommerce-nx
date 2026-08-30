-- Codigo de verificacao do Search Console, colado no painel em vez de no
-- codigo: a alternativa e um deploy so para gravar uma string.
ALTER TABLE "store_settings" ADD COLUMN     "googleSiteVerification" TEXT;
