'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TopBar } from '../../../components/top-bar';
import { CustomerForm } from '../../../components/customer-form';
import { api } from '../../../lib/api';
import type { Customer } from '../../../lib/types';

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<Customer>(`/customers/${params.id}`)
      .then(setCustomer)
      .catch((err) => setError(err.message ?? 'Cliente não encontrado'));
  }, [params.id]);

  return (
    <div>
      <TopBar title="Editar cliente" />
      {error && <p className="px-4 pt-4 text-sm text-red-600">{error}</p>}
      {!customer && !error && <p className="px-4 pt-8 text-center text-sm text-black/50">Carregando...</p>}
      {customer && <CustomerForm customer={customer} />}
    </div>
  );
}
