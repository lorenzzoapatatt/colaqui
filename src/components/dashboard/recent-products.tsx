import Link from "next/link";

import { formatBRLFromCents } from "@/lib/format/money";
import type { ProductView } from "@/modules/products/application/product-repository";
import { ProductStatus } from "@/components/products/product-status";

export function RecentProducts({ products }: { products: ProductView[] }) {
  return (
    <section aria-labelledby="recent-products-title">
      <div className="section-heading">
        <h2 id="recent-products-title" className="section-title">Produtos recentes</h2>
        {products.length ? <Link href="/products">Ver todos</Link> : null}
      </div>
      {products.length ? (
        <ul className="recent-list">
          {products.map((product) => (
            <li key={product.id}>
              <div>
                <Link href={`/products/${product.id}`}>{product.title}</Link>
                <span>{formatBRLFromCents(product.priceCents)}</span>
              </div>
              <ProductStatus status={product.status} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state dashboard-empty">
          <p>Seu catálogo ainda está vazio.</p>
          <Link className="primary-action" href="/products/new">Cadastrar primeiro produto</Link>
        </div>
      )}
    </section>
  );
}
