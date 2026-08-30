-- Quanto foi gasto em anuncio, por dia e por canal.
-- Sem o custo, "Meta Ads trouxe 3 pedidos" nao decide nada: tres pedidos por
-- R$50 e otimo, por R$500 e prejuizo, e a linha aparece igual nos dois casos.
CREATE TABLE "ad_spend" (
    "id" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "canal" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_spend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ad_spend_dia_canal_key" ON "ad_spend"("dia", "canal");
