import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { ObjectStorage } from "@/infrastructure/storage/object-storage";
import type { ImageProcessor } from "@/modules/media/application/image-processor";
import { defaultMediaDependencies } from "@/modules/media/application/media-dependencies";
import type {
  MediaRepository,
  ProductPhotoView,
} from "@/modules/media/application/media-repository";
import {
  PhotoLimitReachedError,
  validatePhotoSize,
} from "@/modules/media/domain/photo";
import {
  ProductNotFoundError,
  ProductVersionConflictError,
} from "@/modules/products/domain/product-errors";

export interface UploadProductPhotoInput {
  productId: string;
  expectedVersion: number;
  bytes: Uint8Array;
}

export interface UploadProductPhotoDependencies {
  repository: MediaRepository;
  processor: ImageProcessor;
  storage: ObjectStorage;
  bucket: string;
  maxPhotoBytes: number;
  maxPhotosPerProduct: number;
}

const identitySchema = z.object({
  productId: z.uuid(),
  expectedVersion: z.number().int().positive(),
});

export async function uploadProductPhoto(
  input: UploadProductPhotoInput,
  dependencies: UploadProductPhotoDependencies = defaultMediaDependencies(),
): Promise<ProductPhotoView> {
  const identity = identitySchema.parse(input);
  validatePhotoSize(input.bytes.byteLength, dependencies.maxPhotoBytes);

  const state = await dependencies.repository.getProductMediaState(
    identity.productId,
  );
  if (!state) throw new ProductNotFoundError();
  if (state.version !== identity.expectedVersion) {
    throw new ProductVersionConflictError();
  }
  if (state.activePhotoCount >= dependencies.maxPhotosPerProduct) {
    throw new PhotoLimitReachedError();
  }

  const normalized = await dependencies.processor.normalize({ bytes: input.bytes });
  const objectScope = `products/${identity.productId}/${randomUUID()}`;
  const originalKey = `${objectScope}/original`;
  const processedKey = `${objectScope}/normalized.jpg`;
  const attemptedKeys: string[] = [];

  let photo: Awaited<ReturnType<MediaRepository["addPhotoAndIncrementProduct"]>>;
  try {
    attemptedKeys.push(originalKey);
    await dependencies.storage.put({
      key: originalKey,
      body: input.bytes,
      contentType: normalized.sourceMimeType,
    });
    attemptedKeys.push(processedKey);
    await dependencies.storage.put({
      key: processedKey,
      body: normalized.bytes,
      contentType: normalized.mimeType,
      metadata: { checksum: normalized.checksum },
    });

    photo = await dependencies.repository.addPhotoAndIncrementProduct({
      productId: identity.productId,
      expectedVersion: identity.expectedVersion,
      objectKey: originalKey,
      processedObjectKey: processedKey,
      bucket: dependencies.bucket,
      mimeType: normalized.mimeType,
      sizeBytes: normalized.sizeBytes,
      width: normalized.width,
      height: normalized.height,
      checksum: normalized.checksum,
      sortOrder: state.activePhotoCount,
    });
    if (!photo) throw new ProductVersionConflictError();
  } catch (error) {
    await Promise.allSettled(
      attemptedKeys.reverse().map((key) => dependencies.storage.delete(key)),
    );
    throw error;
  }

  return {
    ...photo,
    readUrl: await dependencies.storage.createReadUrl(processedKey, 15 * 60),
  };
}
