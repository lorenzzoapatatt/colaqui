import { z } from "zod";

import { defaultMediaDependencies } from "@/modules/media/application/media-dependencies";
import type {
  MediaRepository,
  ProductPhotoRecord,
} from "@/modules/media/application/media-repository";
import { InvalidPhotoOrderError } from "@/modules/media/domain/photo";
import {
  ProductNotFoundError,
  ProductVersionConflictError,
} from "@/modules/products/domain/product-errors";

export interface ReorderPhotosDependencies {
  repository: MediaRepository;
}

const inputSchema = z.object({
  productId: z.uuid(),
  expectedVersion: z.number().int().positive(),
  photoIds: z.array(z.uuid()).max(20),
});

export async function reorderProductPhotos(
  input: z.input<typeof inputSchema>,
  dependencies: ReorderPhotosDependencies = defaultMediaDependencies(),
): Promise<ProductPhotoRecord[]> {
  const parsed = inputSchema.parse(input);
  const state = await dependencies.repository.getProductMediaState(parsed.productId);
  if (!state) throw new ProductNotFoundError();
  if (state.version !== parsed.expectedVersion) {
    throw new ProductVersionConflictError();
  }
  const active = await dependencies.repository.listActivePhotos(parsed.productId);
  const activeIds = new Set(active.map((photo) => photo.id));
  const requestedIds = new Set(parsed.photoIds);
  if (
    active.length !== parsed.photoIds.length ||
    requestedIds.size !== parsed.photoIds.length ||
    parsed.photoIds.some((id) => !activeIds.has(id))
  ) {
    throw new InvalidPhotoOrderError();
  }

  const reordered = await dependencies.repository.reorderPhotosAndIncrementProduct(
    parsed,
  );
  if (!reordered) throw new ProductVersionConflictError();
  return reordered;
}
