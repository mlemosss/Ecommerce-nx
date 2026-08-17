import { createHash } from 'crypto';

/**
 * Normalização e hash dos dados de cliente que vão para a API de Conversões.
 *
 * A Meta casa a pessoa que comprou com a pessoa que viu o anúncio comparando
 * hashes. Se o hash sair de um texto mal normalizado, ele simplesmente não casa
 * — e o erro é totalmente silencioso: a Meta aceita o evento, responde 200, e a
 * correspondência nunca acontece. Por isso cada regra aqui tem teste.
 *
 * SÓ RODA NO SERVIDOR. `crypto` não existe no navegador, e mandar dado pessoal
 * para o cliente hashear seria entregar o dado cru antes.
 */

const sha256 = (valor: string): string =>
  createHash('sha256').update(valor, 'utf8').digest('hex');

/**
 * E-mail: minúsculo, sem espaço nas pontas — e validado.
 *
 * A validação não é frescura. Sem ela, um campo com espaços vira
 * `sha256('')` = `e3b0c442...`, um hash perfeitamente válido que a Meta recebe
 * como se fosse um cliente real. Ele nunca casa com ninguém e ainda derruba a
 * nota de qualidade de correspondência do dataset.
 */
export function hashEmail(bruto?: string | null): string | undefined {
  if (!bruto) return undefined;
  const email = String(bruto).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined;
  return sha256(email);
}

/**
 * Telefone brasileiro com código do país.
 *
 * NÃO testar por prefixo "55". O DDD 55 é Santa Maria/RS: um celular de lá,
 * `(55) 99999-8888`, já começa com 55, e um `if (!digitos.startsWith('55'))`
 * o deixaria sem código de país. O número sai com 11 dígitos em vez de 13, a
 * Meta aceita, e o telefone nunca casa — sem nenhum erro em lugar nenhum.
 *
 * A decisão é por COMPRIMENTO:
 *   10 = DDD + fixo        11 = DDD + celular
 *   12 = 55 + DDD + fixo   13 = 55 + DDD + celular
 */
export function hashPhoneBR(bruto?: string | null): string | undefined {
  if (!bruto) return undefined;
  let digitos = String(bruto).replace(/\D/g, '');

  if (digitos.length === 10 || digitos.length === 11) {
    digitos = `55${digitos}`;
  } else if (digitos.length !== 12 && digitos.length !== 13) {
    return undefined;
  }

  if (!digitos.startsWith('55')) return undefined;
  return sha256(digitos);
}

/** Sem acento, sem espaço, só letras: "São Paulo" vira "saopaulo". */
export function hashCity(bruto?: string | null): string | undefined {
  if (!bruto) return undefined;
  const cidade = String(bruto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return cidade ? sha256(cidade) : undefined;
}

/** Duas letras minúsculas: "SP" vira "sp". */
export function hashState(bruto?: string | null): string | undefined {
  if (!bruto) return undefined;
  const uf = String(bruto).trim().toLowerCase().replace(/[^a-z]/g, '');
  return uf.length === 2 ? sha256(uf) : undefined;
}

/**
 * CEP: só dígitos.
 *
 * A documentação da Meta fala em "5 primeiros dígitos", mas a regra é dos EUA —
 * o CEP brasileiro tem 8. Manda-se os 8; se a nota de correspondência mostrar
 * que não casa, o teste seguinte é mandar 5.
 */
export function hashZip(bruto?: string | null): string | undefined {
  if (!bruto) return undefined;
  const cep = String(bruto).replace(/\D/g, '');
  return cep.length === 8 ? sha256(cep) : undefined;
}

/** País no padrão ISO, minúsculo. A loja só vende no Brasil. */
export function hashCountryBR(): string {
  return sha256('br');
}
