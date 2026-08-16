'use client';

import { useEffect, useState } from 'react';
import { getCustomerProfile, saveCustomerProfile, type CustomerProfile } from '../lib/api';

type Campos = Omit<CustomerProfile, 'id' | 'email' | 'documentNumber'>;

const VAZIO: Campos = {
  name: '',
  phone: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

/** Consulta o CEP e preenche o resto. Falha em silêncio: dá para digitar à mão. */
async function buscarCep(cep: string): Promise<Partial<Campos> | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
    };
  } catch {
    return null;
  }
}

const CAMPOS_ENDERECO: { key: keyof Campos; label: string; classe?: string; max?: number }[] = [
  { key: 'street', label: 'Rua', classe: 'sm:col-span-2' },
  { key: 'number', label: 'Número' },
  { key: 'complement', label: 'Complemento' },
  { key: 'neighborhood', label: 'Bairro' },
  { key: 'city', label: 'Cidade' },
  { key: 'state', label: 'Estado (UF)', max: 2 },
];

/**
 * "Meus dados", editável.
 *
 * A conta mostrava nome, e-mail e telefone como texto morto: quem mudou de
 * telefone ou de casa não tinha onde corrigir e repetia tudo no próximo
 * checkout. O endereço guardado aqui é o que a loja usa para falar com a
 * pessoa e para calcular frete — errado, ele atrapalha as duas coisas.
 *
 * O e-mail aparece mas não é editável: é a identidade de login, e trocar exige
 * confirmar o endereço novo. Digitação errada ali trancaria a conta.
 */
export function ProfileForm({ token }: { token: string | null }) {
  const [aberto, setAberto] = useState(false);
  const [perfil, setPerfil] = useState<CustomerProfile | null>(null);
  const [form, setForm] = useState<Campos>(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState(false);
  // Distinguir 'carregando' de 'falhou': antes as duas ficavam no mesmo
  // `perfil === null`, e uma requisicao perdida deixava 'Carregando seus
  // dados...' na tela para sempre, sem erro e sem como tentar de novo.
  const [falhou, setFalhou] = useState(false);
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => {
    if (!token) return;
    setFalhou(false);
    getCustomerProfile(token).then((p) => {
      if (!p) {
        setFalhou(true);
        return;
      }
      setPerfil(p);
      setForm({
        name: p.name ?? '',
        phone: p.phone ?? '',
        zipCode: p.zipCode ?? '',
        street: p.street ?? '',
        number: p.number ?? '',
        complement: p.complement ?? '',
        neighborhood: p.neighborhood ?? '',
        city: p.city ?? '',
        state: p.state ?? '',
      });
    });
  }, [token, recarregar]);

  function mudar(key: keyof Campos, valor: string) {
    setForm((f) => ({ ...f, [key]: valor }));
    setSalvo(false);
  }

  /**
   * Preenche o que estiver em branco, nunca o que a pessoa já escreveu.
   *
   * O ViaCEP devolve `logradouro: ""` para cidade de CEP único — a maior parte
   * do interior. Espalhar a resposta inteira apagava a rua de quem abriu a
   * edição só para trocar o telefone, e o `limpo()` do servidor transforma
   * vazio em nulo: o endereço sumia do cadastro. Também não sobrescreve "Rua X,
   * fundos", que o ViaCEP não conhece e a cliente precisa.
   */
  async function aoSairDoCep() {
    const achado = await buscarCep(form.zipCode ?? '');
    if (!achado) return;
    setForm((f) => ({
      ...f,
      street: f.street || achado.street || '',
      neighborhood: f.neighborhood || achado.neighborhood || '',
      // Cidade e UF vêm do CEP e não são digitadas à mão: aí a resposta manda.
      city: achado.city || f.city || '',
      state: achado.state || f.state || '',
    }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSalvando(true);
    setErro('');
    const r = await saveCustomerProfile(token, form);
    setSalvando(false);
    if (r.ok) {
      setPerfil(r.profile);
      setSalvo(true);
      setAberto(false);
    } else {
      setErro(r.erro);
    }
  }

  if (falhou) {
    return (
      <div className="mt-8 bg-paper p-6">
        <p className="text-sm text-ink/70" role="alert">
          Não conseguimos carregar seus dados agora.
        </p>
        <button
          type="button"
          onClick={() => setRecarregar((n) => n + 1)}
          className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] underline underline-offset-4"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="mt-8 bg-paper p-6 text-sm text-ink/60" role="status">
        Carregando seus dados...
      </div>
    );
  }

  const endereco = [perfil.street, perfil.number, perfil.neighborhood, perfil.city, perfil.state]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="mt-8 bg-paper p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{perfil.name}</p>
          {perfil.email && <p className="mt-1 text-sm text-ink/70">{perfil.email}</p>}
          {perfil.phone && <p className="text-sm text-ink/70">{perfil.phone}</p>}
          {endereco ? (
            <p className="mt-2 text-sm text-ink/60">
              {endereco}
              {perfil.zipCode ? ` — CEP ${perfil.zipCode}` : ''}
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink/60">
              Sem endereço salvo. Preencha para o frete já vir calculado no próximo pedido.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] underline underline-offset-4 transition hover:no-underline"
        >
          {aberto ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      {salvo && !aberto && (
        <p className="mt-4 text-sm font-semibold text-ink" role="status">
          Dados atualizados.
        </p>
      )}

      {aberto && (
        <form onSubmit={salvar} className="mt-6 border-t border-line pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="eyebrow text-ink/50">Nome completo</span>
              <input
                value={form.name ?? ''}
                onChange={(e) => mudar('name', e.target.value)}
                required
                className="input-field mt-2"
              />
            </label>

            <label className="block">
              <span className="eyebrow text-ink/50">Telefone / WhatsApp</span>
              <input
                value={form.phone ?? ''}
                onChange={(e) => mudar('phone', e.target.value)}
                inputMode="tel"
                placeholder="(11) 99999-9999"
                className="input-field mt-2"
              />
            </label>

            <label className="block">
              <span className="eyebrow text-ink/50">CEP</span>
              <input
                value={form.zipCode ?? ''}
                onChange={(e) => mudar('zipCode', e.target.value)}
                onBlur={aoSairDoCep}
                inputMode="numeric"
                placeholder="00000-000"
                className="input-field mt-2"
              />
            </label>

            {CAMPOS_ENDERECO.map((campo) => (
              <label key={campo.key} className={`block ${campo.classe ?? ''}`}>
                <span className="eyebrow text-ink/50">{campo.label}</span>
                <input
                  value={form[campo.key] ?? ''}
                  onChange={(e) => mudar(campo.key, e.target.value)}
                  maxLength={campo.max}
                  className="input-field mt-2"
                />
              </label>
            ))}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-ink/50">
            E-mail e CPF não mudam por aqui — eles identificam sua conta e seus pedidos. Se precisar
            corrigir, fale com a gente pelo WhatsApp.
          </p>

          {erro && (
            <p className="mt-4 text-sm text-red-700" role="alert">
              {erro}
            </p>
          )}

          <button type="submit" disabled={salvando} className="btn-primary mt-6 !px-8 !py-3.5">
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      )}
    </div>
  );
}
