import { TopBar } from '../../../components/top-bar';
import { CustomerForm } from '../../../components/customer-form';

export default function NewCustomerPage() {
  return (
    <div>
      <TopBar title="Novo cliente" />
      <CustomerForm />
    </div>
  );
}
