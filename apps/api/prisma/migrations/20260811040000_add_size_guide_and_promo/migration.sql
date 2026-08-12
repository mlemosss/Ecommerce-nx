-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN     "googleAdsId" TEXT,
ADD COLUMN     "googleAdsConversionLabel" TEXT,
ADD COLUMN     "sizeGuide" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "progressiveDiscount" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "promoBannerText" TEXT,
ADD COLUMN     "promoBannerEndsAt" TIMESTAMP(3);
