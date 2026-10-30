import { createHash } from "node:crypto";

import type { ProductCondition } from "@/modules/products/domain/product";

export interface PublishableProduct {
  title: string;
  description: string;
  condition: ProductCondition;
  priceCents: number;
  categoryHint: string | null;
  brand: string | null;
  locationText: string | null;
  postalCode: string | null;
  photoChecksums: readonly string[];
}

export function computeProductSnapshotHash(product: PublishableProduct): string {
  const canonical = JSON.stringify({
    title: product.title,
    description: product.description,
    condition: product.condition,
    categoryHint: product.categoryHint,
    brand: product.brand,
    locationText: product.locationText,
    postalCode: product.postalCode,
    priceCents: product.priceCents,
    photoChecksums: [...product.photoChecksums],
  });
  return createHash("sha256").update(canonical).digest("hex");
}
