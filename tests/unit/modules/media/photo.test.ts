// @vitest-environment node

import { createHash } from "node:crypto";

import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import type { ObjectStorage } from "@/infrastructure/storage/object-storage";
import type { ImageProcessor } from "@/modules/media/application/image-processor";
import type { MediaRepository } from "@/modules/media/application/media-repository";
import { uploadProductPhoto } from "@/modules/media/application/upload-product-photo";
import { validatePhotoSize } from "@/modules/media/domain/photo";
import { SharpImageProcessor } from "@/modules/media/infrastructure/sharp-image-processor";

async function image(format: "jpeg" | "png" | "webp", width = 80, height = 60) {
  const source = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 30, g: 120, b: 80 },
    },
  });
  return source[format]().toBuffer();
}

describe("photo validation and normalization", () => {
  it.each(["jpeg", "png", "webp"] as const)(
    "sniffs and accepts real %s bytes regardless of a filename",
    async (format) => {
      const processor = new SharpImageProcessor();

      const normalized = await processor.normalize({
        bytes: await image(format, 2_400, 1_600),
      });
      const metadata = await sharp(normalized.bytes).metadata();

      expect(normalized.mimeType).toBe("image/jpeg");
      expect(normalized.width).toBe(2_000);
      expect(normalized.height).toBeLessThanOrEqual(2_000);
      expect(normalized.checksum).toBe(
        createHash("sha256").update(normalized.bytes).digest("hex"),
      );
      expect(metadata.format).toBe("jpeg");
      expect(metadata.exif).toBeUndefined();
    },
  );

  it("rejects malformed bytes, GIF, and PDF based on content", async () => {
    const processor = new SharpImageProcessor();
    const gif = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: "red",
      },
    })
      .gif()
      .toBuffer();

    for (const bytes of [
      Buffer.from("not an image"),
      gif,
      Buffer.from("%PDF-1.7 fake"),
    ]) {
      await expect(processor.normalize({ bytes })).rejects.toMatchObject({
        status: 415,
        code: "UNSUPPORTED_PHOTO_TYPE",
      });
    }
  });

  it("rejects a file over 10 MiB before processing or object persistence", async () => {
    const maxBytes = 10 * 1024 * 1024;
    expect(() => validatePhotoSize(maxBytes, maxBytes)).not.toThrow();
    expect(() => validatePhotoSize(maxBytes + 1, maxBytes)).toThrowError(
      expect.objectContaining({ status: 413, code: "PHOTO_TOO_LARGE" }),
    );

    const repository = {
      getProductMediaState: vi.fn().mockResolvedValue({
        version: 1,
        activePhotoCount: 0,
      }),
    } as unknown as MediaRepository;
    const processor = { normalize: vi.fn() } as unknown as ImageProcessor;
    const storage = { put: vi.fn() } as unknown as ObjectStorage;

    await expect(
      uploadProductPhoto(
        {
          productId: "00000000-0000-4000-8000-000000000001",
          expectedVersion: 1,
          bytes: new Uint8Array(maxBytes + 1),
        },
        {
          repository,
          processor,
          storage,
          bucket: "colaqui",
          maxPhotoBytes: maxBytes,
          maxPhotosPerProduct: 20,
        },
      ),
    ).rejects.toMatchObject({ status: 413 });
    expect(processor.normalize).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("rejects a twenty-first active photo before processing or persistence", async () => {
    const repository = {
      getProductMediaState: vi.fn().mockResolvedValue({
        version: 1,
        activePhotoCount: 20,
      }),
    } as unknown as MediaRepository;
    const processor = { normalize: vi.fn() } as unknown as ImageProcessor;
    const storage = { put: vi.fn() } as unknown as ObjectStorage;

    await expect(
      uploadProductPhoto(
        {
          productId: "00000000-0000-4000-8000-000000000001",
          expectedVersion: 1,
          bytes: await image("jpeg"),
        },
        {
          repository,
          processor,
          storage,
          bucket: "colaqui",
          maxPhotoBytes: 10 * 1024 * 1024,
          maxPhotosPerProduct: 20,
        },
      ),
    ).rejects.toMatchObject({ status: 409, code: "PHOTO_LIMIT_REACHED" });
    expect(processor.normalize).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });
});
