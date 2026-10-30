import { z } from "zod";

import type { ProductView } from "@/modules/products/application/product-repository";
import { defaultProductDependencies, type ProductDependencies } from "@/modules/products/application/create-product";
import { ProductNotFoundError } from "@/modules/products/domain/product-errors";

export async function getProduct(
  id: string,
  dependencies: ProductDependencies = defaultProductDependencies(),
): Promise<ProductView> {
  const productId = z.uuid().parse(id);
  const product = await dependencies.repository.findById(productId);
  if (!product) throw new ProductNotFoundError();
  return product;
}
