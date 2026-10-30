import { createHash } from "node:crypto";

import sharp from "sharp";

import type {
  ImageProcessor,
  NormalizedImage,
  NormalizeImageInput,
} from "@/modules/media/application/image-processor";
import { UnsupportedPhotoTypeError } from "@/modules/media/domain/photo";

const sourceMimeTypes = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export class SharpImageProcessor implements ImageProcessor {
  async normalize({ bytes }: NormalizeImageInput): Promise<NormalizedImage> {
    try {
      const source = Buffer.from(bytes);
      const metadata = await sharp(source, { failOn: "error" }).metadata();
      const sourceMimeType = metadata.format
        ? sourceMimeTypes[metadata.format as keyof typeof sourceMimeTypes]
        : undefined;
      if (!sourceMimeType) throw new UnsupportedPhotoTypeError();

      const result = await sharp(source, { failOn: "error" })
        .rotate()
        .resize({
          width: 2_000,
          height: 2_000,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      if (!result.info.width || !result.info.height) {
        throw new UnsupportedPhotoTypeError();
      }

      return {
        bytes: result.data,
        sourceMimeType,
        mimeType: "image/jpeg",
        sizeBytes: result.data.byteLength,
        width: result.info.width,
        height: result.info.height,
        checksum: createHash("sha256").update(result.data).digest("hex"),
      };
    } catch (error) {
      if (error instanceof UnsupportedPhotoTypeError) throw error;
      throw new UnsupportedPhotoTypeError();
    }
  }
}
