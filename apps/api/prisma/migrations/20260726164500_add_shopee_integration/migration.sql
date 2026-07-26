-- AlterTable
ALTER TABLE "products" ADD COLUMN     "shopeeItemId" BIGINT;

-- CreateTable
CREATE TABLE "shopee_integration" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "shopId" BIGINT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "defaultCategoryId" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopee_integration_pkey" PRIMARY KEY ("id")
);

