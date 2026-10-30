// @vitest-environment node

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import { archiveProduct } from "@/modules/products/application/archive-product";
import { createProduct } from "@/modules/products/application/create-product";
import { listProducts } from "@/modules/products/application/list-products";
import { updateProduct } from "@/modules/products/application/update-product";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://colaqui:colaqui_dev@localhost:55432/colaqui";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const baseInput = {
  title: "Cadeira de madeira",
  description:
    "Cadeira usada em bom estado, firme e pronta para uma nova casa.",
  condition: "GOOD" as const,
  priceCents: 12_345,
  categoryHint: "Móveis",
  brand: "Artesanal",
  locationText: "São Paulo - SP",
  postalCode: "01001-000",
};

async function clearProducts(): Promise<void> {
  await prisma.$transaction([
    prisma.listingAttempt.deleteMany(),
    prisma.assistedTask.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.listing.deleteMany(),
    prisma.productPhoto.deleteMany(),
    prisma.product.deleteMany(),
  ]);
}

describe("Prisma product repository", () => {
  beforeEach(clearProducts);
  afterAll(() => prisma.$disconnect());

  it("uses a version predicate so a stale update never overwrites newer data", async () => {
    const repository = new PrismaProductRepository(prisma);
    const created = await createProduct(baseInput, { repository });

    const updated = await updateProduct(
      {
        id: created.id,
        expectedVersion: 1,
        title: "Cadeira restaurada",
      },
      { repository },
    );

    expect(updated.version).toBe(2);
    await expect(
      updateProduct(
        { id: created.id, expectedVersion: 1, title: "Escrita obsoleta" },
        { repository },
      ),
    ).rejects.toMatchObject({ code: "PRODUCT_VERSION_CONFLICT" });
    await expect(prisma.product.findUniqueOrThrow({ where: { id: created.id } })).resolves.toMatchObject({
      title: "Cadeira restaurada",
      version: 2,
    });
  });

  it("refuses to archive a product with an active listing without changing it", async () => {
    const repository = new PrismaProductRepository(prisma);
    const created = await createProduct(baseInput, { repository });
    const listing = await prisma.listing.create({
      data: {
        productId: created.id,
        platform: "ENJOEI",
        mode: "ASSISTED",
        status: "ACTIVE",
      },
    });

    await expect(
      archiveProduct(
        { id: created.id, expectedVersion: created.version },
        { repository },
      ),
    ).rejects.toMatchObject({ code: "PRODUCT_HAS_ACTIVE_LISTINGS" });
    await expect(prisma.product.findUniqueOrThrow({ where: { id: created.id } })).resolves.toMatchObject({
      status: "DRAFT",
      archivedAt: null,
      version: 1,
    });

    await prisma.listing.update({
      where: { id: listing.id },
      data: { status: "CLOSED" },
    });
    const archived = await archiveProduct(
      { id: created.id, expectedVersion: created.version },
      { repository },
    );
    expect(archived).toMatchObject({ status: "ARCHIVED", version: 2 });
  });

  it("excludes archived rows by default and paginates with an opaque product cursor", async () => {
    const repository = new PrismaProductRepository(prisma);
    const first = await createProduct(baseInput, { repository });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await createProduct(
      { ...baseInput, title: "Mesa de madeira" },
      { repository },
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    const third = await createProduct(
      { ...baseInput, title: "Banco de madeira" },
      { repository },
    );
    await archiveProduct(
      { id: first.id, expectedVersion: first.version },
      { repository },
    );

    const pageOne = await listProducts({ limit: 1 }, { repository });
    const pageTwo = await listProducts(
      { limit: 1, cursor: pageOne.nextCursor ?? undefined },
      { repository },
    );

    expect(pageOne.items.map((product) => product.id)).toEqual([third.id]);
    expect(pageOne.nextCursor).toBe(third.id);
    expect(pageTwo.items.map((product) => product.id)).toEqual([second.id]);
    expect(pageTwo.nextCursor).toBeNull();

    const archived = await listProducts(
      { status: "ARCHIVED", limit: 10 },
      { repository },
    );
    expect(archived.items.map((product) => product.id)).toEqual([first.id]);
  });
});
