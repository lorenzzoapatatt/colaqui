import Link from "next/link";

import { ProductArchiveButton } from "@/components/products/product-archive-button";
import { ProductStatus } from "@/components/products/product-status";
import { ProductPhotoManager } from "@/components/products/product-photo-manager";
import { formatBRLFromCents } from "@/lib/format/money";
import { requirePageOwner } from "@/modules/auth/presentation/current-owner";
import { getProduct } from "@/modules/products/application/get-product";
import { listProductPhotos } from "@/modules/media/application/list-product-photos";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  await requirePageOwner();
  const product = await getProduct((await params).productId);
  const photos = await listProductPhotos(product.id);

  return (
    <main className="app-shell app-shell--narrow">
      <header className="page-header">
        <div>
          <ProductStatus status={product.status} />
          <h1>{product.title}</h1>
          <p className="detail-price">{formatBRLFromCents(product.priceCents)}</p>
        </div>
        <Link className="primary-action" href={`/products/${product.id}/edit`}>Editar produto</Link>
      </header>

      <section className="detail-card">
        <h2>Descrição</h2>
        <p className="preserve-lines">{product.description}</p>
        <dl className="detail-list">
          <div><dt>Estado</dt><dd>{product.condition}</dd></div>
          <div><dt>Categoria</dt><dd>{product.categoryHint ?? "Não informada"}</dd></div>
          <div><dt>Marca</dt><dd>{product.brand ?? "Não informada"}</dd></div>
          <div><dt>Local</dt><dd>{product.locationText ?? "Não informado"}</dd></div>
        </dl>
      </section>
      <ProductPhotoManager
        productId={product.id}
        initialPhotos={photos}
        initialVersion={product.version}
      />
      <ProductArchiveButton productId={product.id} version={product.version} />
    </main>
  );
}
