'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { comprimirImagem } from '../lib/comprimir-imagem';
import { submitStoreReview } from '../lib/api';

/**
 * Avaliação da loja, aberta a qualquer pessoa.
 *
 * Diferente da avaliação de produto, que exige o token de um pedido. Esta é
 * sobre a experiência de comprar aqui — atendimento, entrega, a peça no corpo —
 * e existe por um motivo concreto: as primeiras clientes da NO EXCUSE
 * compraram **antes de o site existir**. Elas não têm pedido no sistema, e são
 * justamente quem tem mais o que dizer.
 *
 * Nada entra no ar sozinho: a lojista aprova em Depoimentos. Link público sem
 * aprovação é mural de recados da internet.
 */
export function AvaliarLojaForm() {
  const [nome, setNome] = useState('');
  const [anonima, setAnonima] = useState(false);
  const [email, setEmail] = useState('');
  const [nota, setNota] = useState(0);
  const [texto, setTexto] = useState('');
  const [foto, setFoto] = useState('');
  // Campo isca, invisível. Robô preenche tudo que encontra; gente não vê.
  const [isca, setIsca] = useState('');
  const [estado, setEstado] = useState<'parado' | 'enviando' | 'pronto'>('parado');
  const [erro, setErro] = useState('');

  async function escolherFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro('');
    try {
      setFoto(await comprimirImagem(file));
    } catch {
      setErro('Não consegui ler essa imagem. Tente outra.');
    }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (nota === 0) {
      setErro('Escolha de uma a cinco estrelas.');
      return;
    }
    setEstado('enviando');
    setErro('');

    const r = await submitStoreReview({
      customerName: anonima ? undefined : nome,
      anonima,
      email,
      rating: nota,
      quote: texto,
      photoUrl: foto || undefined,
      website: isca || undefined,
    });

    if (r.ok) {
      setEstado('pronto');
    } else {
      setEstado('parado');
      setErro(r.erro);
    }
  }

  if (estado === 'pronto') {
    return (
      <div className="bg-paper p-8 text-center">
        <p className="text-3xl" aria-hidden>
          ♥
        </p>
        <h2 className="section-title mt-4">Obrigada de verdade</h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink/70">
          Sua avaliação chegou. A gente lê cada uma antes de publicar — em breve ela aparece na
          página inicial, ajudando quem ainda está em dúvida.
        </p>
        <Link href="/produtos" className="btn-primary mt-8 inline-flex">
          Ver as peças
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-8">
      <div>
        <span className="eyebrow text-ink/50">Sua nota</span>
        <div className="mt-3 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNota(n)}
              aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
              aria-pressed={nota === n}
              className={`text-3xl leading-none transition ${
                n <= nota ? 'text-amber-500' : 'text-ink/20 hover:text-ink/40'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="eyebrow text-ink/50">Como você quer aparecer</span>

        <div className="mt-3 space-y-2">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="radio"
              name="identificacao"
              checked={!anonima}
              onChange={() => setAnonima(false)}
              className="mt-1"
            />
            <span>
              Com o meu nome
              <span className="mt-0.5 block text-xs text-ink/50">
                Pode ser só o primeiro nome, se preferir.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="radio"
              name="identificacao"
              checked={anonima}
              onChange={() => setAnonima(true)}
              className="mt-1"
            />
            <span>
              Sem me identificar
              <span className="mt-0.5 block text-xs text-ink/50">
                Aparece como “Cliente NO EXCUSE”. Sua nota e seu texto entram igual.
              </span>
            </span>
          </label>
        </div>

        {!anonima && (
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            minLength={2}
            maxLength={60}
            placeholder="Seu nome"
            aria-label="Seu nome"
            className="input-field mt-3 w-full"
          />
        )}
      </div>

      <label className="block">
        <span className="eyebrow text-ink/50">Seu e-mail</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="voce@email.com"
          autoComplete="email"
          className="input-field mt-2 w-full"
        />
        <span className="mt-1.5 block text-xs leading-relaxed text-ink/50">
          Não aparece no site nem vira lista de e-mail marketing. É só para a gente poder te
          agradecer — ou resolver, se alguma coisa não foi como devia.
        </span>
      </label>

      <label className="block">
        <span className="eyebrow text-ink/50">O que você achou</span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          required
          minLength={10}
          maxLength={600}
          rows={5}
          placeholder="Como serviu, o caimento, o tecido, o atendimento — o que você contaria para uma amiga."
          className="input-field mt-2 w-full resize-y"
        />
      </label>

      <div>
        <span className="eyebrow text-ink/50">Uma foto usando (opcional)</span>
        <p className="mt-1.5 text-xs leading-relaxed text-ink/50">
          É o que mais ajuda quem está em dúvida no tamanho — ver a peça em alguém de verdade, e não
          só em foto de estúdio.
        </p>

        {foto ? (
          <div className="mt-3 flex items-center gap-4">
            <div className="relative h-28 w-24 overflow-hidden bg-paper">
              <Image src={foto} alt="Sua foto" fill className="object-cover" unoptimized />
            </div>
            <button
              type="button"
              onClick={() => setFoto('')}
              className="text-xs font-semibold uppercase tracking-[0.12em] underline underline-offset-4"
            >
              Trocar foto
            </button>
          </div>
        ) : (
          <label className="mt-3 flex cursor-pointer items-center justify-center border border-dashed border-ink/25 px-4 py-6 text-sm text-ink/60 transition hover:border-ink/50">
            <input type="file" accept="image/*" onChange={escolherFoto} className="sr-only" />
            Escolher foto
          </label>
        )}
      </div>

      {/* Isca: fora da tela, mas não `display:none` — robô ignora o que está
          escondido desse jeito, e preenche o que está só fora do enquadramento. */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label>
          Site
          <input
            tabIndex={-1}
            autoComplete="off"
            value={isca}
            onChange={(e) => setIsca(e.target.value)}
          />
        </label>
      </div>

      {erro && (
        <p className="text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}

      <div>
        <button type="submit" disabled={estado === 'enviando'} className="btn-primary">
          {estado === 'enviando' ? 'Enviando...' : 'Enviar avaliação'}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-ink/50">
          Sua avaliação passa por uma leitura antes de entrar no site. Não publicamos e-mail nem
          telefone — só o nome, a nota, o texto e a foto, se você mandar.
        </p>
      </div>
    </form>
  );
}
