/**
 * Para onde mandar a pessoa depois do login.
 *
 * Só aceita caminho interno: precisa começar com uma barra e não pode ter uma
 * segunda barra logo em seguida. `//site-de-golpe.com` é uma URL absoluta
 * disfarçada de caminho — sem esta checagem, um link
 * `noexcusenx.com.br/conta/entrar?voltar=//site-de-golpe.com` levaria a cliente
 * para fora da loja no segundo exato em que ela acabou de digitar a senha, com
 * o endereço da NO EXCUSE ainda na barra do navegador quando ela clicou.
 */
export function caminhoDeVolta(valor: string | null | undefined, padrao = '/conta'): string {
  if (!valor) return padrao;
  if (!valor.startsWith('/')) return padrao;
  if (valor.startsWith('//')) return padrao;
  return valor;
}
