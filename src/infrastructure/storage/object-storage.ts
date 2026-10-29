import type { Readable } from "node:stream";

export interface PutObjectInput {
  key: string;
  body: Uint8Array | Readable;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface StoredObject {
  key: string;
  etag?: string;
}

export interface ReadObject {
  body: Readable;
  contentType?: string;
  contentLength?: number;
  metadata?: Record<string, string>;
}

export interface ObjectStorage {
  check(): Promise<void>;
  put(input: PutObjectInput): Promise<StoredObject>;
  getStream(key: string): Promise<ReadObject>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  createReadUrl(key: string, expiresInSeconds: number): Promise<string>;
}
