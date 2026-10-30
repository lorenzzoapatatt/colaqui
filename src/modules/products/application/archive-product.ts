import { z } from "zod";

import type { ProductView } from "@/modules/products/application/product-repository";
import { defaultProductDependencies, type ProductDependencies } from "@/modules/products/application/create-product";
import {
  ProductHasActiveListingsError,
  ProductNotFoundError,
  ProductVersionConflictError,
} from "@/modules/products/domain/product-errors";

export interface ArchiveProductInput {
  id: string;
  expectedVersion: number;
}

const archiveSchema = z.object({
  id: z.uuid(),
  expectedVersion: z.number().int().positive(),
});

export async function archiveProduct(
  input: ArchiveProductInput,
  dependencies: ProductDependencies = defaultProductDependencies(),
): Promise<ProductView> {
  const parsed = archiveSchema.parse(input);
  const current = await dependencies.repository.findById(parsed.id);
  if (!current) throw new ProductNotFoundError();
  if (current.version !== parsed.expectedVersion) {
    throw new ProductVersionConflictError();
  }
  if (await dependencies.repository.hasActiveListings(parsed.id)) {
    throw new ProductHasActiveListingsError();
  }
  const archived = await dependencies.repository.archive(
    parsed.id,
    parsed.expectedVersion,
  );
  if (!archived) throw new ProductVersionConflictError();
  return archived;
}
