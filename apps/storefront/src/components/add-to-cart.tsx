'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Product } from '../lib/types';
import { useCart } from '../lib/cart-context';
import { getVariantPrice } from '../lib/products';
import { formatInstallments, formatPrice } from '../lib/format';
import { describeBlocks } from '../lib/description';
import {
  availabilityOf,
  colorsForDisplay,
  defaultSelection,
  isSoldOut,
  sizesFor,
  stockOf,
} from '../lib/availability';
import { SizeGuide } from './size-guide';
import { StockAlertForm } from './stock-alert-form';

/** Quantas peças da mesma variação a loja deixa levar de uma vez. */
const MAX_POR_PEDIDO = 10;

export function AddToCart({ product, sizeGuide }: { product: Product; sizeGuide?: string }) {
  const { addItem } = useCart();
  // Abre numa combinação que existe e tem estoque. O padrão antigo era
  // colors[0]+sizes[0], que na Legging dava uma variação esgotada.
  const inicial = defaultSelection(product);
  const [size, setSize] = useState(inicial.size);
  const [color, setColor] = useState(inicial.color);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const price = getVariantPrice(product, color, size);

  // Grade e cores completas, sempre. O que muda com a seleção é só a aparência
  // do botão: riscado quando aquela combinação não dá para comprar. Clicar num
  // riscado é o caminho para pedir aviso — inclusive num tamanho que a loja
  // ainda não fabrica, que é o dado que decide o que mandar produzir.
  const sizes = sizesFor(product);
  const colors = colorsForDisplay(product);

  const estoque = stockOf(product, color, size);
  const situacao = availabilityOf(product, color, size);
  const podeComprar = situacao === 'disponivel';
  const esgotadoDeVez = isSoldOut(product);
  const maximo = Math.min(MAX_POR_PEDIDO, Math.max(1, estoque));

  /**
   * Trocar de cor não mexe mais no tamanho escolhido. A grade é a mesma para
   * toda cor, então a seleção continua válida — e se a combinação nova não
   * tiver estoque, é justamente o caso em que queremos oferecer o aviso.
   */
  function escolherCor(nova: string) {
    setColor(nova);
    setAdded(false);
  }

  function handleAdd() {
    if (!podeComprar) return;
    addItem({ productId: product.id, size, color, quantity: Math.min(quantity, maximo) });
    setAdded(true);
  }

  return (
    <div className="flex flex-col gap-7">
      <div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-black tracking-tight">{formatPrice(price)}</span>
          {product.compareAtPrice && (
            <span className="text-lg text-ink/60 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink/60">{formatInstallments(price)}</p>
      </div>

      {/* Descrição vem do cadastro do produto; vazia, a seção nem aparece.
          O texto é lido por blocos, para a ficha técnica sair como lista e não
          como parágrafo corrido:
            • linha iniciada por -, • ou * vira item de lista (basta uma quebra
              de linha entre os itens, não precisa de linha em branco);
            • linha curta terminada em ":" vira título de seção;
            • o resto é parágrafo.
          A leitura está em lib/description.ts, porque a meta description da
          página do produto usa o mesmo parser. */}
      {product.description?.trim() && (
        <div className="space-y-4 border-t border-line pt-6">
          <p className="eyebrow text-ink/50">Descrição</p>
          {describeBlocks(product.description).map((block, index) => {
            if (block.kind === 'list') {
              return (
                <ul key={index} className="space-y-1.5">
                  {block.items.map((item, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm leading-relaxed text-ink/75"
                    >
                      <span aria-hidden className="text-ink/30">
                        —
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              );
            }
            if (block.kind === 'heading') {
              return (
                <p key={index} className="eyebrow pt-2 text-ink/50">
                  {block.text}
                </p>
              );
            }
            return (
              <p key={index} className="text-sm leading-relaxed text-ink/75">
                {block.text}
              </p>
            );
          })}
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="eyebrow text-ink/50">Tamanho</p>
          {sizeGuide && <SizeGuide category={product.category} sizeGuide={sizeGuide} />}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sizes.map((s) => (
            <OptionButton
              key={s}
              active={size === s}
              soldOut={stockOf(product, color, s) === 0}
              onClick={() => {
                setSize(s);
                setAdded(false);
              }}
              className="h-11 min-w-[2.75rem] px-3"
            >
              {s}
            </OptionButton>
          ))}
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3 text-ink/50">Cor</p>
        <div className="flex flex-wrap gap-1.5">
          {colors.map((c) => (
            <OptionButton
              key={c}
              active={color === c}
              // Riscada quando aquela cor não tem nenhum tamanho com estoque.
              soldOut={sizes.every((s) => stockOf(product, c, s) === 0)}
              onClick={() => escolherCor(c)}
              className="h-11 px-4"
            >
              {c}
            </OptionButton>
          ))}
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3 text-ink/50">Quantidade</p>
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center border border-ink/15">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={!podeComprar}
              className="flex h-11 w-11 items-center justify-center text-lg transition hover:bg-paper disabled:opacity-30"
              aria-label="Diminuir quantidade"
            >
              −
            </button>
            <span className="w-10 text-center text-sm font-bold">{quantity}</span>
            <button
              type="button"
              // Teto no estoque real: pedir 5 de uma variação com 2 só era
              // recusado no fim do checkout, depois de digitar tudo.
              onClick={() => setQuantity((q) => Math.min(maximo, q + 1))}
              disabled={!podeComprar || quantity >= maximo}
              className="flex h-11 w-11 items-center justify-center text-lg transition hover:bg-paper disabled:opacity-30"
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>
          {/* Escassez verdadeira, tirada do estoque — não é um selo de marketing. */}
          {podeComprar && estoque <= 3 && (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/60">
              {estoque === 1 ? 'Última peça' : `Restam ${estoque}`}
            </p>
          )}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!podeComprar}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:bg-ink/25 disabled:shadow-none disabled:hover:translate-y-0"
        >
          {podeComprar ? 'Adicionar ao carrinho' : 'Esgotado'}
        </button>
        {!podeComprar && (
          <>
            <p className="mt-3 text-center text-sm text-ink/60">
              {esgotadoDeVez
                ? 'Esta peça está esgotada em todos os tamanhos e cores.'
                : `${color} no tamanho ${size} está sem estoque. Experimente outra combinação acima.`}
            </p>
            {/* A chave inclui cor e tamanho: trocar a seleção limpa o formulário
                em vez de deixar um "pronto, vamos te avisar" de outra peça. */}
            <div className="mt-4">
              <StockAlertForm
                key={`${color}|${size}`}
                productId={product.id}
                color={color}
                size={size}
              />
            </div>
          </>
        )}
      </div>

      {added && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center"
          onClick={() => setAdded(false)}
          role="dialog"
          aria-label="Produto adicionado ao carrinho"
        >
          <div
            className="w-full max-w-sm bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
              </svg>
              <p className="text-xs font-bold uppercase tracking-[0.16em]">
                Adicionado ao carrinho
              </p>
            </div>
            <p className="mt-3 text-sm text-ink/60">
              {product.name} · {color} · {size} · {quantity} un
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/checkout" className="btn-primary w-full">
                Finalizar compra
              </Link>
              <Link href="/carrinho" className="btn-secondary w-full">
                Ver carrinho
              </Link>
              <button
                type="button"
                onClick={() => setAdded(false)}
                className="w-full py-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60 underline underline-offset-4 transition hover:text-ink"
              >
                Continuar comprando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Botão de cor/tamanho.
 *
 * Esgotado continua clicável de propósito: a cliente precisa poder ver que o
 * tamanho dela existe e está em falta — esconder faria parecer que a loja nem
 * fabrica aquele tamanho. O que muda é a aparência (riscado, apagado) e o
 * `aria-disabled`, que avisa o leitor de tela sem tirar o foco do teclado.
 */
function OptionButton({
  active,
  soldOut = false,
  onClick,
  className = '',
  children,
}: {
  active: boolean;
  soldOut?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-disabled={soldOut}
      title={soldOut ? 'Sem estoque' : undefined}
      className={`relative border text-sm font-semibold transition ${className} ${
        active
          ? 'border-ink bg-ink text-white'
          : soldOut
            ? 'border-ink/10 text-ink/35 line-through decoration-ink/30 hover:border-ink/25'
            : 'border-ink/15 hover:border-ink'
      } ${soldOut && active ? 'line-through decoration-white/70 decoration-2' : ''}`}
    >
      {children}
      {/* Faixa diagonal no canto quando esgotado e selecionado: no fundo preto
          o risco branco quase some, e é justamente o estado em que a cliente
          precisa entender por que o botão de comprar está apagado. */}
      {soldOut && active && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-0 w-0 border-l-8 border-t-8 border-l-transparent border-t-white/70"
        />
      )}
    </button>
  );
}
