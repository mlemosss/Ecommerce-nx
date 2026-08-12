import { parseTiers } from '../lib/progressive-discount';

/**
 * Faixa de promoção acima da barra de avisos.
 *
 * Some sozinha quando a data passa — promoção que fica no ar depois de acabar
 * gera reclamação de cliente que veio pelo anúncio antigo. Sem texto, também
 * não aparece.
 */
export function PromoBanner({
  text,
  endsAt,
  progressiveDiscount,
}: {
  text: string | null;
  endsAt: string | null;
  progressiveDiscount: string;
}) {
  const tiers = parseTiers(progressiveDiscount);

  // Sem texto próprio, monta um a partir das faixas configuradas — assim a
  // faixa nunca anuncia um desconto diferente do que o carrinho vai aplicar.
  const fallback =
    tiers.length > 0
      ? tiers.map((t) => `${t.minItems}+ ${t.minItems === 1 ? 'peça' : 'peças'} = ${t.percent}% off`).join('  ·  ')
      : null;

  const message = text?.trim() || fallback;
  if (!message) return null;

  if (endsAt) {
    const deadline = new Date(endsAt);
    if (!Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now()) return null;
  }

  return (
    <div className="bg-white text-ink">
      <div className="container-page flex items-center justify-center py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.16em]">
        {message}
      </div>
    </div>
  );
}
