import type { ProductStatus as ProductStatusValue } from "@/modules/products/domain/product";

const STATUS_LABELS: Record<ProductStatusValue, string> = {
  DRAFT: "Rascunho",
  READY: "Pronto para anunciar",
  LISTED: "Anunciado",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  ARCHIVED: "Arquivado",
};

export function ProductStatus({ status }: { status: ProductStatusValue }) {
  return <span className={`product-status product-status--${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span>;
}
