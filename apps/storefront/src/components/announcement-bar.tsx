import { formatPrice } from '../lib/format';

/**
 * Faixa preta acima do cabeçalho. Carrega só informação verdadeira e vinda de
 * Configurações — nada de cupom inventado, que a loja não teria como honrar.
 */
export function AnnouncementBar({
  freeShippingThreshold,
  maxInstallments,
}: {
  freeShippingThreshold: number;
  maxInstallments: number;
}) {
  const items = [
    `Frete grátis acima de ${formatPrice(freeShippingThreshold)}`,
    'Troca grátis em até 30 dias',
    `Pix, cartão em até ${maxInstallments}x ou boleto`,
  ];

  return (
    <div className="bg-ink text-white">
      <div className="container-page flex h-9 items-center justify-center gap-3 overflow-hidden text-[11px] font-semibold uppercase tracking-[0.16em]">
        {items.map((item, index) => (
          <span
            key={item}
            className={index === 0 ? '' : 'hidden items-center gap-3 sm:flex'}
          >
            {index > 0 && (
              <span aria-hidden className="text-white/30">
                ·
              </span>
            )}
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
