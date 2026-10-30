export interface NormalizeImageInput {
  bytes: Uint8Array;
}

export interface NormalizedImage {
  bytes: Buffer;
  sourceMimeType: "image/jpeg" | "image/png" | "image/webp";
  mimeType: "image/jpeg";
  sizeBytes: number;
  width: number;
  height: number;
  checksum: string;
}

export interface ImageProcessor {
  normalize(input: NormalizeImageInput): Promise<NormalizedImage>;
}
