// @vitest-environment node

import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";

import { S3Client } from "@aws-sdk/client-s3";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { S3ObjectStorage } from "@/infrastructure/storage/s3-object-storage";

const bucket = process.env.S3_BUCKET ?? "colaqui";
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? "http://127.0.0.1:9000",
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "minioadmin",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "minioadmin",
  },
});
const storage = new S3ObjectStorage({ client, bucket });
const createdKeys: string[] = [];

async function readBody(body: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

describe("S3ObjectStorage", () => {
  beforeAll(async () => {
    await storage.check();
  });

  afterEach(async () => {
    await Promise.all(createdKeys.splice(0).map((key) => storage.delete(key)));
  });

  it("stores, reads, signs and deletes an object against MinIO", async () => {
    const key = `integration/${randomUUID()}.txt`;
    createdKeys.push(key);

    await storage.put({
      key,
      body: Buffer.from("colaqui-storage"),
      contentType: "text/plain",
      metadata: { fixture: "true" },
    });

    expect(await storage.exists(key)).toBe(true);
    const object = await storage.getStream(key);
    expect(object.contentType).toBe("text/plain");
    expect(await readBody(object.body)).toBe("colaqui-storage");
    expect(await storage.createReadUrl(key, 60)).toMatch(/^http:\/\/127\.0\.0\.1:9000\/colaqui\//);

    await storage.delete(key);
    createdKeys.splice(createdKeys.indexOf(key), 1);
    expect(await storage.exists(key)).toBe(false);
  });
});
