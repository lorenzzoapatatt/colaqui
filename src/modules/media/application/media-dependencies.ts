import { getPrisma } from "@/infrastructure/db/prisma";
import { getS3ObjectStorage } from "@/infrastructure/storage/s3-object-storage";
import { getServerEnv } from "@/lib/config/env";
import { PrismaMediaRepository } from "@/modules/media/infrastructure/prisma-media-repository";
import { SharpImageProcessor } from "@/modules/media/infrastructure/sharp-image-processor";

export function defaultMediaDependencies() {
  const env = getServerEnv();
  return {
    repository: new PrismaMediaRepository(getPrisma()),
    processor: new SharpImageProcessor(),
    storage: getS3ObjectStorage(env.s3),
    bucket: env.s3.bucket,
    maxPhotoBytes: env.media.maxPhotoBytes,
    maxPhotosPerProduct: env.media.maxPhotosPerProduct,
  };
}
