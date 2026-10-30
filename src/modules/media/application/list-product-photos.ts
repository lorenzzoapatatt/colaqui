import { z } from "zod";

import { defaultMediaDependencies } from "@/modules/media/application/media-dependencies";
import type {
  MediaRepository,
  ProductPhotoView,
} from "@/modules/media/application/media-repository";
import type { ObjectStorage } from "@/infrastructure/storage/object-storage";
import { ProductNotFoundError } from "@/modules/products/domain/product-errors";

export interface ListPhotosDependencies {
  repository: MediaRepository;
  storage: ObjectStorage;
}

export async function listProductPhotos(
  productId: string,
  dependencies: ListPhotosDependencies = defaultMediaDependencies(),
): Promise<ProductPhotoView[]> {
  const id = z.uuid().parse(productId);
  const state = await dependencies.repository.getProductMediaState(id);
  if (!state) throw new ProductNotFoundError();
  const photos = await dependencies.repository.listActivePhotos(id);
  return Promise.all(
    photos.map(async (photo) => ({
      ...photo,
      readUrl: await dependencies.storage.createReadUrl(
        photo.processedObjectKey,
        15 * 60,
      ),
    })),
  );
}
