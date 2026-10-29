import { Readable } from "node:stream";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  ObjectStorage,
  PutObjectInput,
  ReadObject,
  StoredObject,
} from "@/infrastructure/storage/object-storage";

export interface S3ObjectStorageOptions {
  client: S3Client;
  bucket: string;
}

export interface S3ConnectionConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

let cachedStorage: S3ObjectStorage | undefined;

export function getS3ObjectStorage(config: S3ConnectionConfig): S3ObjectStorage {
  cachedStorage ??= new S3ObjectStorage({
    bucket: config.bucket,
    client: new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
  });
  return cachedStorage;
}

function isNotFound(error: unknown): boolean {
  const exception = error as S3ServiceException;
  return exception?.name === "NotFound" || exception?.$metadata?.httpStatusCode === 404;
}

export class S3ObjectStorage implements ObjectStorage {
  readonly #client: S3Client;
  readonly #bucket: string;

  constructor({ client, bucket }: S3ObjectStorageOptions) {
    this.#client = client;
    this.#bucket = bucket;
  }

  async check(): Promise<void> {
    await this.#client.send(new ListObjectsV2Command({ Bucket: this.#bucket, MaxKeys: 1 }));
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    const result = await this.#client.send(
      new PutObjectCommand({
        Bucket: this.#bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.metadata,
      }),
    );

    return { key: input.key, ...(result.ETag ? { etag: result.ETag } : {}) };
  }

  async getStream(key: string): Promise<ReadObject> {
    const result = await this.#client.send(
      new GetObjectCommand({ Bucket: this.#bucket, Key: key }),
    );

    if (!(result.Body instanceof Readable)) {
      throw new TypeError("S3 returned a non-Node stream body");
    }

    return {
      body: result.Body,
      ...(result.ContentType ? { contentType: result.ContentType } : {}),
      ...(result.ContentLength !== undefined ? { contentLength: result.ContentLength } : {}),
      ...(result.Metadata ? { metadata: result.Metadata } : {}),
    };
  }

  async delete(key: string): Promise<void> {
    await this.#client.send(new DeleteObjectCommand({ Bucket: this.#bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.#client.send(new HeadObjectCommand({ Bucket: this.#bucket, Key: key }));
      return true;
    } catch (error) {
      if (isNotFound(error)) {
        return false;
      }
      throw error;
    }
  }

  createReadUrl(key: string, expiresInSeconds: number): Promise<string> {
    return getSignedUrl(
      this.#client,
      new GetObjectCommand({ Bucket: this.#bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }
}
