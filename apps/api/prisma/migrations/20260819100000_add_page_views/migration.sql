-- Visitas somadas por dia e por pagina. Contador, e nao registro: uma linha por
-- dia e rota em vez de uma por visita. Nao guarda quem visitou - nao ha id,
-- cookie nem IP, so um numero que sobe.
CREATE TABLE "page_views" (
    "id" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "rota" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "sessoes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "page_views_dia_rota_key" ON "page_views"("dia", "rota");
