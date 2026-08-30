-- De onde a visita veio. Sem isto o painel dizia quantas pessoas entraram e
-- nao de onde - e a pergunta que decide orcamento e se o pago traz mais que o
-- organico, o que so se responde separando os dois na entrada.
ALTER TABLE "page_views" ADD COLUMN     "canal" TEXT NOT NULL DEFAULT 'Direto';

-- A unicidade passa a incluir o canal: a mesma pagina no mesmo dia tem uma
-- linha por origem.
DROP INDEX "page_views_dia_rota_key";
CREATE UNIQUE INDEX "page_views_dia_rota_canal_key" ON "page_views"("dia", "rota", "canal");
