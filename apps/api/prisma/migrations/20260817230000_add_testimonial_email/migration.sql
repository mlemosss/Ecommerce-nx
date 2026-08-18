-- E-mail de quem avaliou a loja pelo link publico. Nunca exibido no site:
-- serve para a loja agradecer ou procurar quem nao gostou.
ALTER TABLE "testimonials" ADD COLUMN     "email" TEXT;
