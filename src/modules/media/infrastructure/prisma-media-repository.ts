import type { PrismaClient, ProductPhoto } from "@/generated/prisma/client";
import type {
  AddProductPhotoInput,
  MediaRepository,
  ProductMediaState,
  ProductPhotoRecord,
} from "@/modules/media/application/media-repository";
import { InvalidPhotoOrderError } from "@/modules/media/domain/photo";

function toPhotoRecord(photo: ProductPhoto): ProductPhotoRecord {
  return {
    id: photo.id,
    productId: photo.productId,
    objectKey: photo.objectKey,
    processedObjectKey: photo.processedObjectKey,
    bucket: photo.bucket,
    mimeType: photo.mimeType,
    sizeBytes: photo.sizeBytes,
    width: photo.width,
    height: photo.height,
    checksum: photo.checksum,
    sortOrder: photo.sortOrder,
    createdAt: photo.createdAt,
    updatedAt: photo.updatedAt,
  };
}

export class PrismaMediaRepository implements MediaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getProductMediaState(
    productId: string,
  ): Promise<ProductMediaState | null> {
    const [product, activePhotoCount] = await Promise.all([
      this.prisma.product.findFirst({
        where: { id: productId, archivedAt: null, deletedAt: null },
        select: { version: true },
      }),
      this.prisma.productPhoto.count({
        where: { productId, deletedAt: null },
      }),
    ]);
    return product ? { version: product.version, activePhotoCount } : null;
  }

  async addPhotoAndIncrementProduct(
    input: AddProductPhotoInput,
  ): Promise<ProductPhotoRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const product = await transaction.product.updateMany({
        where: {
          id: input.productId,
          version: input.expectedVersion,
          archivedAt: null,
          deletedAt: null,
        },
        data: { version: { increment: 1 } },
      });
      if (product.count !== 1) return null;
      const photo = await transaction.productPhoto.create({
        data: {
          productId: input.productId,
          objectKey: input.objectKey,
          processedObjectKey: input.processedObjectKey,
          bucket: input.bucket,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          width: input.width,
          height: input.height,
          checksum: input.checksum,
          sortOrder: input.sortOrder,
        },
      });
      return toPhotoRecord(photo);
    });
  }

  async listActivePhotos(productId: string): Promise<ProductPhotoRecord[]> {
    const photos = await this.prisma.productPhoto.findMany({
      where: { productId, deletedAt: null },
      orderBy: { sortOrder: "asc" },
    });
    return photos.map(toPhotoRecord);
  }

  async reorderPhotosAndIncrementProduct(input: {
    productId: string;
    expectedVersion: number;
    photoIds: string[];
  }): Promise<ProductPhotoRecord[] | null> {
    return this.prisma.$transaction(async (transaction) => {
      const active = await transaction.productPhoto.findMany({
        where: { productId: input.productId, deletedAt: null },
        orderBy: { sortOrder: "asc" },
      });
      const activeIds = new Set(active.map((photo) => photo.id));
      if (
        active.length !== input.photoIds.length ||
        new Set(input.photoIds).size !== input.photoIds.length ||
        input.photoIds.some((id) => !activeIds.has(id))
      ) {
        throw new InvalidPhotoOrderError();
      }
      const product = await transaction.product.updateMany({
        where: {
          id: input.productId,
          version: input.expectedVersion,
          archivedAt: null,
          deletedAt: null,
        },
        data: { version: { increment: 1 } },
      });
      if (product.count !== 1) return null;

      await transaction.productPhoto.updateMany({
        where: { productId: input.productId, deletedAt: null },
        data: { sortOrder: { increment: 1_000 } },
      });
      for (const [sortOrder, id] of input.photoIds.entries()) {
        await transaction.productPhoto.update({
          where: { id },
          data: { sortOrder },
        });
      }
      const reordered = await transaction.productPhoto.findMany({
        where: { productId: input.productId, deletedAt: null },
        orderBy: { sortOrder: "asc" },
      });
      return reordered.map(toPhotoRecord);
    });
  }

  async removePhotoAndIncrementProduct(input: {
    productId: string;
    photoId: string;
    expectedVersion: number;
  }): Promise<boolean | null> {
    return this.prisma.$transaction(async (transaction) => {
      const photo = await transaction.productPhoto.findFirst({
        where: {
          id: input.photoId,
          productId: input.productId,
          deletedAt: null,
        },
      });
      if (!photo) return false;
      const product = await transaction.product.updateMany({
        where: {
          id: input.productId,
          version: input.expectedVersion,
          archivedAt: null,
          deletedAt: null,
        },
        data: { version: { increment: 1 } },
      });
      if (product.count !== 1) return null;
      const minimumOrder = await transaction.productPhoto.aggregate({
        where: { productId: input.productId },
        _min: { sortOrder: true },
      });
      await transaction.productPhoto.update({
        where: { id: photo.id },
        data: {
          deletedAt: new Date(),
          sortOrder: (minimumOrder._min.sortOrder ?? 0) - 1,
        },
      });
      const remaining = await transaction.productPhoto.findMany({
        where: { productId: input.productId, deletedAt: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true },
      });
      await transaction.productPhoto.updateMany({
        where: { productId: input.productId, deletedAt: null },
        data: { sortOrder: { increment: 1_000 } },
      });
      for (const [sortOrder, activePhoto] of remaining.entries()) {
        await transaction.productPhoto.update({
          where: { id: activePhoto.id },
          data: { sortOrder },
        });
      }
      return true;
    });
  }
}
