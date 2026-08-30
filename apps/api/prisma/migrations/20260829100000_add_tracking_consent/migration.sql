-- Consentimento de medicao, gravado no pedido.
-- A politica promete que nada vai para a Meta se a pessoa recusar. O navegador
-- cumpria; o servidor nao tinha como saber, porque a escolha morria no
-- navegador. Falso por padrao: sem resposta explicita, nao ha evento.
ALTER TABLE "orders" ADD COLUMN     "trackingConsent" BOOLEAN NOT NULL DEFAULT false;
