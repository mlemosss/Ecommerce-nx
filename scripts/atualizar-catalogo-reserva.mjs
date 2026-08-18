/**
 * Refresca a copia do catalogo que fica no bundle.
 *
 * Roda antes do build da loja. Se a API responder, grava o catalogo do
 * momento; se nao responder, mantem a copia que ja esta versionada — que e
 * exatamente o caso em que ela vai ser usada. Nunca falha o build: uma
 * vitrine com dado de tres dias atras e melhor do que um deploy bloqueado.
 */
import fs from 'node:fs';
import path from 'node:path';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';
const destino = path.join('apps', 'storefront', 'src', 'lib', 'catalogo-reserva.json');

const controle = new AbortController();
const limite = setTimeout(() => controle.abort(), 20_000);

try {
  const res = await fetch(`${API_URL}/catalog/products`, { signal: controle.signal });
  if (!res.ok) throw new Error(`catalogo respondeu ${res.status}`);

  const produtos = await res.json();
  if (!Array.isArray(produtos) || produtos.length === 0) {
    throw new Error('catalogo veio vazio');
  }

  fs.writeFileSync(destino, `${JSON.stringify(produtos, null, 2)}\n`);
  console.log(`[reserva] catalogo atualizado: ${produtos.length} produtos`);
} catch (erro) {
  const atual = fs.existsSync(destino) ? JSON.parse(fs.readFileSync(destino, 'utf8')).length : 0;
  console.warn(
    `[reserva] nao consegui atualizar (${erro.message}). Mantendo a copia de ${atual} produtos.`
  );
} finally {
  clearTimeout(limite);
}
