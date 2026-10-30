import { ProductForm } from "@/components/products/product-form";
import { requirePageOwner } from "@/modules/auth/presentation/current-owner";

export default async function NewProductPage() {
  await requirePageOwner();
  return (
    <main className="app-shell app-shell--narrow">
      <header className="page-header">
        <div>
          <p className="eyebrow">Novo item</p>
          <h1>Cadastrar produto</h1>
          <p>Use informações claras. As fotos serão adicionadas depois de salvar.</p>
        </div>
      </header>
      <ProductForm mode="create" />
    </main>
  );
}
