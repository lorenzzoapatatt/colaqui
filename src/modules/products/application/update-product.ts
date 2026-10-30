import { z } from "zod";

import type { ProductView } from "@/modules/products/application/product-repository";
import { defaultProductDependencies, type ProductDependencies } from "@/modules/products/application/create-product";
import {
  assertProductTransition,
  parseCreateProductInput,
  PRODUCT_STATUSES,
  type ProductCondition,
  type ProductStatus,
} from "@/modules/products/domain/product";
import {
  ProductNotFoundError,
  ProductVersionConflictError,
} from "@/modules/products/domain/product-errors";

export interface UpdateProductInput {
  id: string;
  expectedVersion: number;
  title?: string;
  description?: string;
  condition?: ProductCondition;
  priceCents?: number;
  categoryHint?: string;
  brand?: string;
  locationText?: string;
  postalCode?: string;
  status?: ProductStatus;
}

const updateIdentitySchema = z.object({
  id: z.uuid(),
  expectedVersion: z.number().int().positive(),
  status: z.enum(PRODUCT_STATUSES).optional(),
});

export async function updateProduct(
  input: UpdateProductInput,
  dependencies: ProductDependencies = defaultProductDependencies(),
): Promise<ProductView> {
  const identity = updateIdentitySchema.parse(input);
  const current = await dependencies.repository.findById(identity.id);
  if (!current) throw new ProductNotFoundError();
  if (current.version !== identity.expectedVersion) {
    throw new ProductVersionConflictError();
  }

  const status = identity.status ?? current.status;
  if (status !== current.status) assertProductTransition(current.status, status);

  const parsed = parseCreateProductInput({
    title: input.title ?? current.title,
    description: input.description ?? current.description,
    condition: input.condition ?? current.condition,
    priceCents: input.priceCents ?? current.priceCents,
    categoryHint: input.categoryHint ?? current.categoryHint ?? undefined,
    brand: input.brand ?? current.brand ?? undefined,
    locationText: input.locationText ?? current.locationText ?? undefined,
    postalCode: input.postalCode ?? current.postalCode ?? undefined,
    quantity: 1,
  });
  const updated = await dependencies.repository.update({
    id: identity.id,
    expectedVersion: identity.expectedVersion,
    data: { ...parsed, status },
  });
  if (!updated) throw new ProductVersionConflictError();
  return updated;
}
