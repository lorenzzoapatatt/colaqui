import { z } from "zod";

import type { ProductPage } from "@/modules/products/application/product-repository";
import { defaultProductDependencies, type ProductDependencies } from "@/modules/products/application/create-product";
import { PRODUCT_STATUSES } from "@/modules/products/domain/product";

const listProductsSchema = z.object({
  status: z.enum(PRODUCT_STATUSES).optional(),
  cursor: z.uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export type ListProductsInput = z.input<typeof listProductsSchema>;

export async function listProducts(
  input: ListProductsInput = {},
  dependencies: ProductDependencies = defaultProductDependencies(),
): Promise<ProductPage> {
  const query = listProductsSchema.parse(input);
  return dependencies.repository.list({
    ...query,
    includeArchived: query.status === "ARCHIVED",
  });
}
