// @vitest-environment node

import "dotenv/config";

import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import type {
  ObjectStorage,
  PutObjectInput,
} from "@/infrastructure/storage/object-storage";
import { getS3ObjectStorage } from "@/infrastructure/storage/s3-object-storage";
import { getServerEnv } from "@/lib/config/env";
import type {
  AddProductPhotoInput,
  MediaRepository,
  ProductPhotoRecord,
} from "@/modules/media/application/media-repository";
import { removeProductPhoto } from "@/modules/media/application/remove-product-photo";
import { reorderProductPhotos } from "@/modules/media/application/reorder-product-photos";
import { uploadProductPhoto } from "@/modules/media/application/upload-product-photo";
import { PrismaMediaRepository } from "@/modules/media/infrastructure/prisma-media-repository";
import { SharpImageProcessor } from "@/modules/media/infrastructure/sharp-image-processor";

const env = getServerEnv();
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.databaseUrl }),
});
const storage = getS3ObjectStorage(env.s3);
const processor = new SharpImageProcessor();

async function testImage(color: string): Promise<Buffer> {
  return sharp({
    create: { width: 120, height: 80, channels: 3, background: color },
  })
    .png()
    .toBuffer();
}

async function clearMedia(): Promise<void> {
  const photos = await prisma.productPhoto.findMany({
    select: { objectKey: true, processedObjectKey: true },
  });
  await Promise.allSettled(
    photos.flatMap((photo) => [
      storage.delete(photo.objectKey),
      storage.delete(photo.processedObjectKey),
    ]),
  );
  await prisma.$transaction([
    prisma.listingAttempt.deleteMany(),
    prisma.assistedTask.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.listing.deleteMany(),
    prisma.productPhoto.deleteMany(),
    prisma.product.deleteMany(),
  ]);
}

async function createProduct() {
  return prisma.product.create({
    data: {
      title: "Cadeira de madeira",
      description:
        "Cadeira usada em bom estado, firme e pronta para uma nova casa.",
      condition: "GOOD",
      priceCents: 12_345,
    },
  });
}

function dependencies(
  repository: MediaRepository,
  objectStorage: ObjectStorage = storage,
) {
  return {
    repository,
    processor,
    storage: objectStorage,
    bucket: env.s3.bucket,
    maxPhotoBytes: env.media.maxPhotoBytes,
    maxPhotosPerProduct: env.media.maxPhotosPerProduct,
  };
}

class RecordingFailingStorage implements ObjectStorage {
  readonly attemptedKeys: string[] = [];
  private puts = 0;

  constructor(
    private readonly delegate: ObjectStorage,
    private readonly failOnPut: number,
  ) {}

  check = () => this.delegate.check();
  getStream = (key: string) => this.delegate.getStream(key);
  delete = (key: string) => this.delegate.delete(key);
  exists = (key: string) => this.delegate.exists(key);
  createReadUrl = (key: string, expires: number) =>
    this.delegate.createReadUrl(key, expires);

  async put(input: PutObjectInput) {
    this.puts += 1;
    this.attemptedKeys.push(input.key);
    if (this.puts === this.failOnPut) throw new Error("injected put failure");
    return this.delegate.put(input);
  }
}

class FailingAddRepository implements MediaRepository {
  constructor(private readonly delegate: MediaRepository) {}

  getProductMediaState = (id: string) => this.delegate.getProductMediaState(id);
  listActivePhotos = (id: string) => this.delegate.listActivePhotos(id);
  reorderPhotosAndIncrementProduct = (
    input: Parameters<MediaRepository["reorderPhotosAndIncrementProduct"]>[0],
  ) => this.delegate.reorderPhotosAndIncrementProduct(input);
  removePhotoAndIncrementProduct = (
    input: Parameters<MediaRepository["removePhotoAndIncrementProduct"]>[0],
  ) => this.delegate.removePhotoAndIncrementProduct(input);
  async addPhotoAndIncrementProduct(
    input: AddProductPhotoInput,
  ): Promise<ProductPhotoRecord | null> {
    void input;
    throw new Error("injected repository failure");
  }
}

describe("photo lifecycle with PostgreSQL and MinIO", () => {
  beforeEach(clearMedia);
  afterAll(async () => {
    await clearMedia();
    await prisma.$disconnect();
  });

  it("stores original and normalized objects plus one row and increments product version", async () => {
    const product = await createProduct();
    const repository = new PrismaMediaRepository(prisma);

    const photo = await uploadProductPhoto(
      {
        productId: product.id,
        expectedVersion: product.version,
        bytes: await testImage("#246b52"),
      },
      dependencies(repository),
    );

    expect(photo.readUrl).toContain(photo.processedObjectKey);
    expect(photo.objectKey).not.toContain(product.title);
    await expect(storage.exists(photo.objectKey)).resolves.toBe(true);
    await expect(storage.exists(photo.processedObjectKey)).resolves.toBe(true);
    await expect(prisma.productPhoto.count()).resolves.toBe(1);
    await expect(prisma.product.findUniqueOrThrow({ where: { id: product.id } })).resolves.toMatchObject({
      version: 2,
    });
  });

  it("creates no row or object when image bytes are malformed", async () => {
    const product = await createProduct();
    const repository = new PrismaMediaRepository(prisma);

    await expect(
      uploadProductPhoto(
        {
          productId: product.id,
          expectedVersion: product.version,
          bytes: Buffer.from("not-an-image"),
        },
        dependencies(repository),
      ),
    ).rejects.toMatchObject({ status: 415 });

    await expect(prisma.productPhoto.count()).resolves.toBe(0);
    await expect(prisma.product.findUniqueOrThrow({ where: { id: product.id } })).resolves.toMatchObject({
      version: 1,
    });
  });

  it("cleans the current request objects after storage or repository failure", async () => {
    const product = await createProduct();
    const repository = new PrismaMediaRepository(prisma);
    const failingStorage = new RecordingFailingStorage(storage, 2);

    await expect(
      uploadProductPhoto(
        {
          productId: product.id,
          expectedVersion: 1,
          bytes: await testImage("#7c3d3d"),
        },
        dependencies(repository, failingStorage),
      ),
    ).rejects.toThrow("injected put failure");
    for (const key of failingStorage.attemptedKeys) {
      await expect(storage.exists(key)).resolves.toBe(false);
    }

    const recordingStorage = new RecordingFailingStorage(storage, 99);
    await expect(
      uploadProductPhoto(
        {
          productId: product.id,
          expectedVersion: 1,
          bytes: await testImage("#3d4d7c"),
        },
        dependencies(new FailingAddRepository(repository), recordingStorage),
      ),
    ).rejects.toThrow("injected repository failure");
    for (const key of recordingStorage.attemptedKeys) {
      await expect(storage.exists(key)).resolves.toBe(false);
    }
    await expect(prisma.productPhoto.count()).resolves.toBe(0);
  });

  it("requires every active photo exactly once, reorders, and removes logically", async () => {
    const product = await createProduct();
    const repository = new PrismaMediaRepository(prisma);
    const first = await uploadProductPhoto(
      { productId: product.id, expectedVersion: 1, bytes: await testImage("red") },
      dependencies(repository),
    );
    const second = await uploadProductPhoto(
      { productId: product.id, expectedVersion: 2, bytes: await testImage("blue") },
      dependencies(repository),
    );

    await expect(
      reorderProductPhotos(
        {
          productId: product.id,
          expectedVersion: 3,
          photoIds: [first.id, first.id],
        },
        { repository },
      ),
    ).rejects.toMatchObject({ code: "INVALID_PHOTO_ORDER" });

    const reordered = await reorderProductPhotos(
      {
        productId: product.id,
        expectedVersion: 3,
        photoIds: [second.id, first.id],
      },
      { repository },
    );
    expect(reordered.map((photo) => photo.id)).toEqual([second.id, first.id]);
    await expect(prisma.product.findUniqueOrThrow({ where: { id: product.id } })).resolves.toMatchObject({
      version: 4,
    });

    await removeProductPhoto(
      { productId: product.id, photoId: second.id, expectedVersion: 4 },
      { repository },
    );
    expect(await repository.listActivePhotos(product.id)).toHaveLength(1);
    await expect(prisma.productPhoto.findUniqueOrThrow({ where: { id: second.id } })).resolves.toMatchObject({
      deletedAt: expect.any(Date),
    });
    await expect(storage.exists(second.objectKey)).resolves.toBe(true);
    await expect(storage.exists(second.processedObjectKey)).resolves.toBe(true);
    await expect(prisma.product.findUniqueOrThrow({ where: { id: product.id } })).resolves.toMatchObject({
      version: 5,
    });

    const replacement = await uploadProductPhoto(
      {
        productId: product.id,
        expectedVersion: 5,
        bytes: await testImage("green"),
      },
      dependencies(repository),
    );
    expect(replacement.sortOrder).toBe(1);
    expect((await repository.listActivePhotos(product.id)).map((photo) => photo.sortOrder)).toEqual([0, 1]);
  });
});
