import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ValuePropDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  storeName?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactWhatsapp?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeShippingThreshold?: number;

  @IsOptional()
  @IsBoolean()
  pixEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  cardEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  boletoEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxInstallments?: number;

  @IsOptional()
  @IsString()
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  facebookUrl?: string;

  @IsOptional()
  @IsString()
  heroTag?: string;

  @IsOptional()
  @IsString()
  heroTitleLine1?: string;

  @IsOptional()
  @IsString()
  heroTitleHighlight?: string;

  @IsOptional()
  @IsString()
  heroSubtitle?: string;

  @IsOptional()
  @IsString()
  heroPrimaryButtonLabel?: string;

  @IsOptional()
  @IsString()
  heroSecondaryButtonLabel?: string;

  @IsOptional()
  @IsString()
  newsletterTitle?: string;

  @IsOptional()
  @IsString()
  newsletterSubtitle?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValuePropDto)
  valueProps?: ValuePropDto[];

  /** Tag do Google Ads, no formato AW-0000000000. */
  @IsOptional()
  @IsString()
  googleAdsId?: string;

  /** Rótulo da ação de conversão de compra, do painel do Google Ads. */
  @IsOptional()
  @IsString()
  googleAdsConversionLabel?: string;

  /** JSON: [{ minItems, percent }]. */
  @IsOptional()
  @IsString()
  progressiveDiscount?: string;

  /** JSON: [{ category, size, bust, waist, hip }]. */
  @IsOptional()
  @IsString()
  sizeGuide?: string;

  /** Cupom oferecido no e-mail de boleto vencido. Vazio = e-mail sem oferta. */
  @IsOptional()
  @IsString()
  winbackCouponCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  winbackCouponPercent?: number;

  /** Cupom do e-mail de agradecimento de quem pediu aviso de reposição. */
  @IsOptional()
  @IsString()
  stockAlertCouponCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  stockAlertCouponPercent?: number;

  @IsOptional()
  @IsString()
  promoBannerText?: string;

  @IsOptional()
  @IsString()
  promoBannerEndsAt?: string;

  @IsOptional()
  @IsString()
  aboutHeadline?: string;

  @IsOptional()
  @IsString()
  aboutBody?: string;

  /** CEP de onde a loja despacha. Vazio = usa a env MELHOR_ENVIO_FROM_CEP. */
  @IsOptional()
  @IsString()
  shippingOriginZip?: string;

  /**
   * Endereco completo de quem posta. O CEP sozinho cota o frete; a etiqueta
   * exige rua, numero, bairro, cidade e UF do remetente.
   */
  @IsOptional()
  @IsString()
  shippingOriginStreet?: string;

  @IsOptional()
  @IsString()
  shippingOriginNumber?: string;

  @IsOptional()
  @IsString()
  shippingOriginComplement?: string;

  @IsOptional()
  @IsString()
  shippingOriginDistrict?: string;

  @IsOptional()
  @IsString()
  shippingOriginCity?: string;

  @IsOptional()
  @IsString()
  shippingOriginState?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  packageHeightCm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  packageWidthCm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  packageLengthCm?: number;

  /** Razão social e CNPJ do rodapé. Exigidos pelo CDC em loja virtual. */
  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  /** Mapa de cliques (Microsoft Clarity). */
  @IsOptional()
  @IsString()
  clarityProjectId?: string;

  @IsOptional()
  @IsString()
  gtmId?: string;

  @IsOptional()
  @IsString()
  metaPixelId?: string;

  @IsOptional()
  @IsString()
  emailFromName?: string;

  @IsOptional()
  @IsString()
  emailFromAddress?: string;
}
