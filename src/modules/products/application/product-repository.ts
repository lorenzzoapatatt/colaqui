import type {
  ParsedProductInput,
  ProductCondition,
  ProductStatus,
} from "@/modules/products/domain/product";

export interface ProductView {
  id: string;
  title: string;
  description: string;
  condition: ProductCondition;
  priceCents: number;
  categoryHint: string | null;
  brand: string | null;
  locationText: string | null;
  postalCode: string | null;
  quantity: 1;
  status: ProductStatus;
  version: number;
  soldAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateStoredProductInput {
  id: string;
  expectedVersion: number;
  data: ParsedProductInput & { status: ProductStatus };
}

export interface ListProductsQuery {
  status?: ProductStatus;
  cursor?: string;
  limit: number;
  includeArchived: boolean;
}

export interface ProductPage {
  items: ProductView[];
  nextCursor: string | null;
}

export interface ProductRepository {
  create(input: ParsedProductInput): Promise<ProductView>;
  findById(id: string, includeArchived?: boolean): Promise<ProductView | null>;
  update(input: UpdateStoredProductInput): Promise<ProductView | null>;
  hasActiveListings(productId: string): Promise<boolean>;
  archive(id: string, expectedVersion: number): Promise<ProductView | null>;
  list(query: ListProductsQuery): Promise<ProductPage>;
}
