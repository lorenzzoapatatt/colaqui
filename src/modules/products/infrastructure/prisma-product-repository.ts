import type { PrismaClient, Product } from "@/generated/prisma/client";
import type {
  ListProductsQuery,
  ProductPage,
  ProductRepository,
  ProductView,
  UpdateStoredProductInput,
} from "@/modules/products/application/product-repository";
import type {
  ParsedProductInput,
  ProductCondition,
  ProductStatus,
} from "@/modules/products/domain/product";
import { ProductHasActiveListingsError } from "@/modules/products/domain/product-errors";

const ACTIVE_LISTING_STATUSES = [
  "PUBLISHING",
  "ACTIVE",
  "PAUSED",
  "CLOSING",
  "ACTION_REQUIRED",
] as const;

export function toProductView(product: Product): ProductView {
  if (product.quantity !== 1) {
    throw new Error("Product quantity invariant violated.");
  }
  return {
    ...product,
    condition: product.condition as ProductCondition,
    status: product.status as ProductStatus,
    quantity: 1,
  };
}

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: ParsedProductInput): Promise<ProductView> {
    const product = await this.prisma.product.create({ data: input });
    return toProductView(product);
  }

  async findById(
    id: string,
    includeArchived = false,
  ): Promise<ProductView | null> {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(!includeArchived ? { archivedAt: null } : {}),
      },
    });
    return product ? toProductView(product) : null;
  }

  async update(input: UpdateStoredProductInput): Promise<ProductView | null> {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.product.updateMany({
        where: {
          id: input.id,
          version: input.expectedVersion,
          archivedAt: null,
          deletedAt: null,
        },
        data: {
          ...input.data,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) return null;
      const product = await transaction.product.findUniqueOrThrow({
        where: { id: input.id },
      });
      return toProductView(product);
    });
  }

  async hasActiveListings(productId: string): Promise<boolean> {
    const count = await this.prisma.listing.count({
      where: {
        productId,
        status: { in: [...ACTIVE_LISTING_STATUSES] },
      },
    });
    return count > 0;
  }

  async archive(
    id: string,
    expectedVersion: number,
  ): Promise<ProductView | null> {
    return this.prisma.$transaction(async (transaction) => {
      const activeListings = await transaction.listing.count({
        where: { productId: id, status: { in: [...ACTIVE_LISTING_STATUSES] } },
      });
      if (activeListings > 0) throw new ProductHasActiveListingsError();

      const archivedAt = new Date();
      const updated = await transaction.product.updateMany({
        where: {
          id,
          version: expectedVersion,
          archivedAt: null,
          deletedAt: null,
        },
        data: {
          status: "ARCHIVED",
          archivedAt,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) return null;
      const product = await transaction.product.findUniqueOrThrow({ where: { id } });
      return toProductView(product);
    });
  }

  async list(query: ListProductsQuery): Promise<ProductPage> {
    const products = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(!query.includeArchived ? { archivedAt: null } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      take: query.limit + 1,
    });
    const hasMore = products.length > query.limit;
    const items = products.slice(0, query.limit).map(toProductView);
    return {
      items,
      nextCursor: hasMore ? items.at(-1)?.id ?? null : null,
    };
  }
}
