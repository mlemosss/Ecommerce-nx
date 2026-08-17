import { createHash } from 'crypto';
import {
  hashCity,
  hashEmail,
  hashPhoneBR,
  hashState,
  hashZip,
} from '../src/lib/meta-hash';

const sha256 = (v: string) => createHash('sha256').update(v, 'utf8').digest('hex');

/** Hash de string vazia. Se ele aparecer, alguma normalização deixou passar lixo. */
const HASH_DO_VAZIO = sha256('');

describe('hashPhoneBR', () => {
  // O bug mais fácil de reintroduzir do projeto inteiro, e o mais silencioso:
  // a Meta aceita o número errado, responde 200, e nada casa.
  it('acrescenta o 55 em celular e fixo sem código de país', () => {
    expect(hashPhoneBR('(11) 98765-4321')).toBe(sha256('5511987654321'));
    expect(hashPhoneBR('(11) 3456-7890')).toBe(sha256('551134567890'));
  });

  it('DDD 55 não é confundido com código do país', () => {
    // Santa Maria/RS. Testar por prefixo "55" deixaria este número com 11
    // dígitos, sem código de país, e ele nunca casaria com ninguém.
    expect(hashPhoneBR('(55) 99999-8888')).toBe(sha256('5555999998888'));
    expect(hashPhoneBR('(55) 3220-1234')).toBe(sha256('555532201234'));
  });

  it('número que já vem completo não ganha 55 de novo', () => {
    expect(hashPhoneBR('5511987654321')).toBe(sha256('5511987654321'));
    expect(hashPhoneBR('+55 (11) 98765-4321')).toBe(sha256('5511987654321'));
  });

  it('descarta o que não é telefone, em vez de hashear lixo', () => {
    expect(hashPhoneBR('não informado')).toBeUndefined();
    expect(hashPhoneBR('123')).toBeUndefined();
    expect(hashPhoneBR('')).toBeUndefined();
    expect(hashPhoneBR(null)).toBeUndefined();
    expect(hashPhoneBR('999999999999999')).toBeUndefined();
  });
});

describe('hashEmail', () => {
  it('normaliza caixa e espaços', () => {
    expect(hashEmail('  Isa@NoExcuse.com.BR ')).toBe(sha256('isa@noexcuse.com.br'));
  });

  it('nunca devolve o hash de string vazia', () => {
    // Sem a validação, isto virava e3b0c442... — um "cliente" que a Meta
    // aceita, que não casa com ninguém, e que derruba a nota do dataset.
    for (const entrada of ['   ', '', 'sem-arroba', '@dominio.com', 'a@b', null, undefined]) {
      const r = hashEmail(entrada);
      expect(r).toBeUndefined();
      expect(r).not.toBe(HASH_DO_VAZIO);
    }
  });
});

describe('hashCity', () => {
  it('tira acento e espaço', () => {
    expect(hashCity('São Paulo')).toBe(sha256('saopaulo'));
    expect(hashCity('BRASÍLIA')).toBe(sha256('brasilia'));
  });

  it('descarta o que sobra vazio', () => {
    expect(hashCity('123')).toBeUndefined();
    expect(hashCity('  ')).toBeUndefined();
  });
});

describe('hashState', () => {
  it('duas letras, minúsculas', () => {
    expect(hashState('SP')).toBe(sha256('sp'));
    expect(hashState(' rs ')).toBe(sha256('rs'));
  });

  it('recusa o que não é UF', () => {
    expect(hashState('São Paulo')).toBeUndefined();
    expect(hashState('S')).toBeUndefined();
  });
});

describe('hashZip', () => {
  it('só os dígitos do CEP', () => {
    expect(hashZip('01233-001')).toBe(sha256('01233001'));
  });

  it('recusa CEP incompleto', () => {
    expect(hashZip('01233')).toBeUndefined();
    expect(hashZip('')).toBeUndefined();
  });
});
