import { ProductForm } from "@/components/products/product-form";
import { requirePageOwner } from "@/modules/auth/presentation/current-owner";
import { getProduct } from "@/modules/products/application/get-product";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  await requirePageOwner();
  const product = await getProduct((await params).productId);
  return (
    <main className="app-shell app-shell--narrow">
      <header className="page-header">
        <div>
          <p className="eyebrow">Editar item</p>
          <h1>{product.title}</h1>
        </div>
      </header>
      <ProductForm mode="edit" product={product} />
    </main>
  );
}
