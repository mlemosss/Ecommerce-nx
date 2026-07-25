import { TopBar } from '../../../components/top-bar';
import { ProductForm } from '../../../components/product-form';

export default function NewProductPage() {
  return (
    <div>
      <TopBar title="Novo produto" />
      <ProductForm />
    </div>
  );
}
