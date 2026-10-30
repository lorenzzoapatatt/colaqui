// @vitest-environment node

import { describe, expect, it } from "vitest";

import { archiveProduct } from "@/modules/products/application/archive-product";
import { createProduct } from "@/modules/products/application/create-product";
import { getProduct } from "@/modules/products/application/get-product";
import { listProducts } from "@/modules/products/application/list-products";
import type {
  ListProductsQuery,
  ProductRepository,
  ProductView,
  UpdateStoredProductInput,
} from "@/modules/products/application/product-repository";
import { updateProduct } from "@/modules/products/application/update-product";

const baseInput = {
  title: "  Cadeira de madeira  ",
  description:
    "  Cadeira usada em bom estado, firme e pronta para uma nova casa.  ",
  condition: "GOOD" as const,
  priceCents: 12_345,
  categoryHint: "Móveis",
  brand: "Artesanal",
  locationText: "São Paulo - SP",
  postalCode: "01001-000",
};

class MemoryProductRepository implements ProductRepository {
  readonly products = new Map<string, ProductView>();
  readonly activeListingIds = new Set<string>();
  lastListQuery: ListProductsQuery | null = null;
  private sequence = 0;

  async create(
    input: Parameters<ProductRepository["create"]>[0],
  ): Promise<ProductView> {
    this.sequence += 1;
    const now = new Date(`2026-10-29T12:00:0${this.sequence}.000Z`);
    const product: ProductView = {
      id: `00000000-0000-4000-8000-${String(this.sequence).padStart(12, "0")}`,
      ...input,
      status: "DRAFT",
      version: 1,
      soldAt: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.products.set(product.id, product);
    return product;
  }

  async findById(id: string, includeArchived = false): Promise<ProductView | null> {
    const product = this.products.get(id) ?? null;
    if (product?.archivedAt && !includeArchived) return null;
    return product;
  }

  async update(input: UpdateStoredProductInput): Promise<ProductView | null> {
    const current = this.products.get(input.id);
    if (!current || current.version !== input.expectedVersion) return null;
    const updated: ProductView = {
      ...current,
      ...input.data,
      version: current.version + 1,
      updatedAt: new Date(current.updatedAt.getTime() + 1_000),
    };
    this.products.set(input.id, updated);
    return updated;
  }

  async hasActiveListings(productId: string): Promise<boolean> {
    return this.activeListingIds.has(productId);
  }

  async archive(id: string, expectedVersion: number): Promise<ProductView | null> {
    const current = this.products.get(id);
    if (!current || current.version !== expectedVersion) return null;
    const archivedAt = new Date("2026-10-29T13:00:00.000Z");
    const archived: ProductView = {
      ...current,
      status: "ARCHIVED",
      archivedAt,
      updatedAt: archivedAt,
      version: current.version + 1,
    };
    this.products.set(id, archived);
    return archived;
  }

  async list(query: ListProductsQuery) {
    this.lastListQuery = query;
    const all = [...this.products.values()]
      .filter((product) => query.includeArchived || !product.archivedAt)
      .filter((product) => !query.status || product.status === query.status)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
    const start = query.cursor
      ? Math.max(0, all.findIndex((product) => product.id === query.cursor) + 1)
      : 0;
    const selected = all.slice(start, start + query.limit + 1);
    const hasMore = selected.length > query.limit;
    const items = selected.slice(0, query.limit);
    return {
      items,
      nextCursor: hasMore ? items.at(-1)?.id ?? null : null,
    };
  }
}

describe("product services", () => {
  it("creates and retrieves a normalized draft", async () => {
    const repository = new MemoryProductRepository();

    const created = await createProduct(baseInput, { repository });

    expect(created).toMatchObject({
      title: "Cadeira de madeira",
      quantity: 1,
      status: "DRAFT",
      version: 1,
    });
    await expect(getProduct(created.id, { repository })).resolves.toEqual(created);
  });

  it("updates publishable fields once and refuses stale writes without overwriting", async () => {
    const repository = new MemoryProductRepository();
    const created = await createProduct(baseInput, { repository });

    const updated = await updateProduct(
      {
        id: created.id,
        expectedVersion: 1,
        title: "Cadeira de madeira restaurada",
      },
      { repository },
    );

    expect(updated).toMatchObject({
      title: "Cadeira de madeira restaurada",
      version: 2,
    });
    await expect(
      updateProduct(
        {
          id: created.id,
          expectedVersion: 1,
          title: "Valor que não pode sobrescrever",
        },
        { repository },
      ),
    ).rejects.toMatchObject({ code: "PRODUCT_VERSION_CONFLICT" });
    expect(repository.products.get(created.id)?.title).toBe(
      "Cadeira de madeira restaurada",
    );
  });

  it("validates status transitions during updates", async () => {
    const repository = new MemoryProductRepository();
    const created = await createProduct(baseInput, { repository });

    const ready = await updateProduct(
      { id: created.id, expectedVersion: 1, status: "READY" },
      { repository },
    );

    expect(ready).toMatchObject({ status: "READY", version: 2 });
    await expect(
      updateProduct(
        { id: created.id, expectedVersion: 2, status: "SOLD" },
        { repository },
      ),
    ).rejects.toMatchObject({ code: "INVALID_PRODUCT_TRANSITION" });
  });

  it("refuses archive while an active listing exists and otherwise archives", async () => {
    const repository = new MemoryProductRepository();
    const created = await createProduct(baseInput, { repository });
    repository.activeListingIds.add(created.id);

    await expect(
      archiveProduct(
        { id: created.id, expectedVersion: 1 },
        { repository },
      ),
    ).rejects.toMatchObject({ code: "PRODUCT_HAS_ACTIVE_LISTINGS" });
    expect(repository.products.get(created.id)?.status).toBe("DRAFT");

    repository.activeListingIds.delete(created.id);
    const archived = await archiveProduct(
      { id: created.id, expectedVersion: 1 },
      { repository },
    );
    expect(archived).toMatchObject({
      status: "ARCHIVED",
      version: 2,
      archivedAt: expect.any(Date),
    });
  });

  it("excludes archived products by default and supports status and cursor filters", async () => {
    const repository = new MemoryProductRepository();
    const first = await createProduct(baseInput, { repository });
    await createProduct({ ...baseInput, title: "Mesa de madeira" }, { repository });
    await archiveProduct(
      { id: first.id, expectedVersion: 1 },
      { repository },
    );

    const defaultPage = await listProducts({ limit: 1 }, { repository });
    expect(defaultPage.items).toHaveLength(1);
    expect(defaultPage.items[0]?.status).not.toBe("ARCHIVED");
    expect(repository.lastListQuery).toMatchObject({ includeArchived: false });

    const archivedPage = await listProducts(
      { status: "ARCHIVED", limit: 10, cursor: first.id },
      { repository },
    );
    expect(repository.lastListQuery).toMatchObject({
      status: "ARCHIVED",
      includeArchived: true,
      cursor: first.id,
      limit: 10,
    });
    expect(archivedPage.items).toEqual([]);
  });
});
