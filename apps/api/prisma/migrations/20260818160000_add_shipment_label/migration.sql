-- Endereco completo do remetente: o CEP sozinho cota frete, mas nao emite
-- etiqueta. Os Correios querem rua, numero, bairro, cidade e UF de quem posta.
ALTER TABLE "store_settings" ADD COLUMN     "shippingOriginStreet" TEXT;
ALTER TABLE "store_settings" ADD COLUMN     "shippingOriginNumber" TEXT;
ALTER TABLE "store_settings" ADD COLUMN     "shippingOriginComplement" TEXT;
ALTER TABLE "store_settings" ADD COLUMN     "shippingOriginDistrict" TEXT;
ALTER TABLE "store_settings" ADD COLUMN     "shippingOriginCity" TEXT;
ALTER TABLE "store_settings" ADD COLUMN     "shippingOriginState" TEXT;

-- Etiqueta do pedido. `shipmentId` e gravado antes da compra: se a resposta se
-- perder, a proxima tentativa reaproveita o envio em vez de pagar duas vezes.
ALTER TABLE "orders" ADD COLUMN     "shippingServiceId" TEXT;
ALTER TABLE "orders" ADD COLUMN     "shipmentId" TEXT;
ALTER TABLE "orders" ADD COLUMN     "shipmentLabelUrl" TEXT;
