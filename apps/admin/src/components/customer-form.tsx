'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import type { Customer, PersonType } from '../lib/types';

interface CustomerFormProps {
  customer?: Customer;
}

export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter();
  const isEdit = Boolean(customer);

  const [name, setName] = useState(customer?.name ?? '');
  const [personType, setPersonType] = useState<PersonType>(customer?.personType ?? 'PF');
  const [documentNumber, setDocumentNumber] = useState(customer?.documentNumber ?? '');
  const [birthDate, setBirthDate] = useState(customer?.birthDate?.slice(0, 10) ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [description, setDescription] = useState(customer?.description ?? '');
  const [tags, setTags] = useState(customer?.tags ?? '');
  const [zipCode, setZipCode] = useState(customer?.zipCode ?? '');
  const [street, setStreet] = useState(customer?.street ?? '');
  const [number, setNumber] = useState(customer?.number ?? '');
  const [complement, setComplement] = useState(customer?.complement ?? '');
  const [neighborhood, setNeighborhood] = useState(customer?.neighborhood ?? '');
  const [city, setCity] = useState(customer?.city ?? '');
  const [state, setState] = useState(customer?.state ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const payload = {
      name,
      personType,
      documentNumber: documentNumber || undefined,
      birthDate: birthDate || undefined,
      phone: phone || undefined,
      email: email || undefined,
      description: description || undefined,
      tags,
      zipCode: zipCode || undefined,
      street: street || undefined,
      number: number || undefined,
      complement: complement || undefined,
      neighborhood: neighborhood || undefined,
      city: city || undefined,
      state: state || undefined,
    };

    setSubmitting(true);
    try {
      if (isEdit && customer) {
        await api.patch(`/customers/${customer.id}`, payload);
      } else {
        await api.post('/customers', payload);
      }
      router.push('/clientes');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar cliente');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!customer) return;
    if (!window.confirm('Excluir este cliente?')) return;
    await api.delete(`/customers/${customer.id}`);
    router.push('/clientes');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 px-4 pb-8 pt-4">
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div>
        <label className="mb-1 block text-sm font-semibold">Nome do cliente</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-semibold">Telefone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Dados</label>
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setPersonType('PF')}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
              personType === 'PF' ? 'border-ink bg-ink text-white' : 'border-black/10'
            }`}
          >
            Pessoa Física
          </button>
          <button
            type="button"
            onClick={() => setPersonType('PJ')}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
              personType === 'PJ' ? 'border-ink bg-ink text-white' : 'border-black/10'
            }`}
          >
            Pessoa Jurídica
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="CPF/CNPJ"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            className="input-field"
          />
          <input
            type="date"
            placeholder="Nascimento"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">Tags</label>
        <input
          placeholder="ex: vip, atacado"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="input-field"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">Descrição do cliente</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="input-field"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Endereço</label>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="CEP" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="input-field" />
          <input placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} className="input-field" />
          <input
            placeholder="Endereço"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            className="input-field col-span-2"
          />
          <input placeholder="Número" value={number} onChange={(e) => setNumber(e.target.value)} className="input-field" />
          <input
            placeholder="Complemento"
            value={complement}
            onChange={(e) => setComplement(e.target.value)}
            className="input-field"
          />
          <input
            placeholder="Bairro"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className="input-field"
          />
          <input placeholder="UF" value={state} onChange={(e) => setState(e.target.value)} className="input-field" />
        </div>
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Salvando...' : 'Salvar'}
      </button>

      {isEdit && customer && (
        <div className="space-y-3 border-t border-black/10 pt-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-black/50">Venda rápida</p>
          <a href={`/vendas?clienteId=${customer.id}`} className="btn-secondary block w-full">
            🛍️ Realizar uma venda
          </a>

          {customer.phone && (
            <a
              href={`https://wa.me/55${customer.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary block w-full"
            >
              💬 Abrir conversa de WhatsApp
            </a>
          )}

          <button type="button" onClick={handleDelete} className="btn-danger w-full">
            Excluir cliente
          </button>
        </div>
      )}
    </form>
  );
}
