-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "passwordSetToken" TEXT,
ADD COLUMN     "passwordSetTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "customers_passwordSetToken_key" ON "customers"("passwordSetToken");
