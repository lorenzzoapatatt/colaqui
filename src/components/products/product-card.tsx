import Link from "next/link";

import { formatBRLFromCents } from "@/lib/format/money";
import type { ProductView } from "@/modules/products/application/product-repository";
import { ProductStatus } from "@/components/products/product-status";

export function ProductCard({ product }: { product: ProductView }) {
  return (
    <article className="product-card">
      <div className="product-card__placeholder" aria-hidden="true">{product.title.slice(0, 1).toUpperCase()}</div>
      <div className="product-card__content">
        <ProductStatus status={product.status} />
        <h2>
          <Link href={`/products/${product.id}`}>{product.title}</Link>
        </h2>
        <p className="product-card__price">{formatBRLFromCents(product.priceCents)}</p>
        <p>{product.condition === "NEW" ? "Novo" : "Usado"}</p>
      </div>
    </article>
  );
}
