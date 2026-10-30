import { getPrisma } from "@/infrastructure/db/prisma";
import type {
  ProductRepository,
  ProductView,
} from "@/modules/products/application/product-repository";
import {
  parseCreateProductInput,
  type CreateProductInput,
} from "@/modules/products/domain/product";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";

export interface ProductDependencies {
  repository: ProductRepository;
}

export function defaultProductDependencies(): ProductDependencies {
  return { repository: new PrismaProductRepository(getPrisma()) };
}

export async function createProduct(
  input: CreateProductInput,
  dependencies = defaultProductDependencies(),
): Promise<ProductView> {
  return dependencies.repository.create(parseCreateProductInput(input));
}
