// @vitest-environment node

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  ConnectionMode,
  ListingStatus,
  Platform,
  PrismaClient,
  ProductCondition,
} from "@/generated/prisma/client";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://colaqui:colaqui_dev@localhost:55432/colaqui";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

async function clearDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.listingAttempt.deleteMany(),
    prisma.assistedTask.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.listing.deleteMany(),
    prisma.channelConnection.deleteMany(),
    prisma.productPhoto.deleteMany(),
    prisma.product.deleteMany(),
    prisma.loginAttempt.deleteMany(),
    prisma.ownerSession.deleteMany(),
    prisma.owner.deleteMany(),
  ]);
}

describe("initial domain schema", () => {
  beforeEach(clearDatabase);
  afterAll(async () => prisma.$disconnect());

  it("allows exactly one owner singleton", async () => {
    await prisma.owner.create({
      data: { singletonKey: "OWNER", email: "owner@example.com", passwordHash: "hash" },
    });

    await expect(
      prisma.owner.create({
        data: { singletonKey: "OWNER", email: "other@example.com", passwordHash: "hash" },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("stores product money and quantity as integers", async () => {
    const product = await prisma.product.create({
      data: {
        title: "Cadeira usada",
        description: "Cadeira conservada para uso em escritório.",
        condition: ProductCondition.GOOD,
        priceCents: 12_345,
      },
    });

    expect(product.priceCents).toBe(12_345);
    expect(product.quantity).toBe(1);
  });

  it("prevents two listings for the same product and platform", async () => {
    const product = await prisma.product.create({
      data: {
        title: "Mesa usada",
        description: "Mesa de madeira em bom estado de conservação.",
        condition: ProductCondition.GOOD,
        priceCents: 30_000,
      },
    });
    const listing = {
      productId: product.id,
      platform: Platform.MERCADO_LIVRE,
      mode: ConnectionMode.API,
      status: ListingStatus.DRAFT,
    };

    await prisma.listing.create({ data: listing });
    await expect(prisma.listing.create({ data: listing })).rejects.toMatchObject({ code: "P2002" });
  });

  it("keeps photo order unique inside a product", async () => {
    const product = await prisma.product.create({
      data: {
        title: "Luminária usada",
        description: "Luminária funcionando e sem partes quebradas.",
        condition: ProductCondition.LIKE_NEW,
        priceCents: 8_000,
      },
    });
    const photo = {
      productId: product.id,
      objectKey: "products/original.jpg",
      processedObjectKey: "products/processed.jpg",
      bucket: "colaqui",
      mimeType: "image/jpeg",
      sizeBytes: 100,
      width: 800,
      height: 600,
      checksum: "sha256",
      sortOrder: 0,
    };

    await prisma.productPhoto.create({ data: photo });
    await expect(
      prisma.productPhoto.create({
        data: { ...photo, objectKey: "products/other.jpg", processedObjectKey: "products/other-p.jpg" },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
