import { catalogoOnline } from '../lib/products';
import { getSettings } from '../lib/api';

/**
 * Faixa de aviso quando a API nao responde.
 *
 * Em 18/08/2026 o banco caiu e a loja passou horas mostrando "Essa pagina
 * saiu de linha" no lugar de cada peca. Hoje a vitrine continua de pe pela
 * copia do catalogo — mas continuar de pe calada seria pior: a pessoa
 * montaria o carrinho, iria ao checkout e so ali descobriria que nao dava.
 *
 * O aviso e curto e honesto: as pecas estao ai, a compra pelo site nao, e o
 * WhatsApp esta funcionando. Some sozinho quando a API volta.
 */
export async function AvisoInstabilidade() {
  const online = await catalogoOnline();
  if (online) return null;

  const settings = await getSettings();
  const zap = settings.contactWhatsapp?.replace(/\D/g, '');
  const mensagem =
    'Oi! Vi o aviso no site e queria comprar. Pode me ajudar?';

  return (
    <div role="status" className="bg-ink px-4 py-3 text-center text-sm text-white">
      Estamos com uma instabilidade no sistema: as pecas estao aqui, mas a compra pelo site pode
      falhar.{' '}
      {zap && (
        <a
          href={`https://wa.me/${zap}?text=${encodeURIComponent(mensagem)}`}
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline underline-offset-4"
        >
          Fale com a gente no WhatsApp
        </a>
      )}
    </div>
  );
}
