-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN     "shippingOriginZip" TEXT,
ADD COLUMN     "packageHeightCm" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "packageWidthCm" INTEGER NOT NULL DEFAULT 16,
ADD COLUMN     "packageLengthCm" INTEGER NOT NULL DEFAULT 20;
