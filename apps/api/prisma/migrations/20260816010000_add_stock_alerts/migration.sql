-- CreateTable
CREATE TABLE "stock_alerts" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id")
);

-- Pedir de novo a mesma peça reaproveita a linha em vez de duplicar o aviso.
CREATE UNIQUE INDEX "stock_alerts_productId_color_size_email_key"
    ON "stock_alerts"("productId", "color", "size", "email");

-- O varredor roda a cada 30 min procurando alerta pendente por produto.
CREATE INDEX "stock_alerts_productId_notifiedAt_idx"
    ON "stock_alerts"("productId", "notifiedAt");

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
