import Link from "next/link";

import { ProductCard } from "@/components/products/product-card";
import { requirePageOwner } from "@/modules/auth/presentation/current-owner";
import { listProducts } from "@/modules/products/application/list-products";

export default async function ProductsPage() {
  await requirePageOwner();
  const page = await listProducts({ limit: 24 });

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Seu catálogo</p>
          <h1>Produtos</h1>
          <p>Cadastre uma vez e prepare cada item para os canais de venda.</p>
        </div>
        <Link className="primary-action" href="/products/new">Cadastrar produto</Link>
      </header>

      {page.items.length ? (
        <section className="product-grid" aria-label="Produtos cadastrados">
          {page.items.map((product) => <ProductCard key={product.id} product={product} />)}
        </section>
      ) : (
        <section className="empty-state">
          <h2>Nenhum produto cadastrado</h2>
          <p>Comece pelo primeiro objeto que você quer vender.</p>
          <Link className="primary-action" href="/products/new">Cadastrar primeiro produto</Link>
        </section>
      )}
    </main>
  );
}
