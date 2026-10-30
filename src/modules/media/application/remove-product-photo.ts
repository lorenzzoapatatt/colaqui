import { z } from "zod";

import { defaultMediaDependencies } from "@/modules/media/application/media-dependencies";
import type { MediaRepository } from "@/modules/media/application/media-repository";
import { PhotoNotFoundError } from "@/modules/media/domain/photo";
import {
  ProductNotFoundError,
  ProductVersionConflictError,
} from "@/modules/products/domain/product-errors";

export interface RemovePhotoDependencies {
  repository: MediaRepository;
}

const inputSchema = z.object({
  productId: z.uuid(),
  photoId: z.uuid(),
  expectedVersion: z.number().int().positive(),
});

export async function removeProductPhoto(
  input: z.input<typeof inputSchema>,
  dependencies: RemovePhotoDependencies = defaultMediaDependencies(),
): Promise<void> {
  const parsed = inputSchema.parse(input);
  const state = await dependencies.repository.getProductMediaState(parsed.productId);
  if (!state) throw new ProductNotFoundError();
  if (state.version !== parsed.expectedVersion) {
    throw new ProductVersionConflictError();
  }
  const removed = await dependencies.repository.removePhotoAndIncrementProduct(parsed);
  if (removed === null) throw new ProductVersionConflictError();
  if (!removed) throw new PhotoNotFoundError();
}
