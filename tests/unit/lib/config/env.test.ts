import { describe, expect, it } from "vitest";

import { parseEnv } from "@/lib/config/env";

const validEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://colaqui:colaqui@localhost:5432/colaqui",
  APP_URL: "http://localhost:3000",
  AUTH_RESET_SECRET: "a-safe-local-reset-secret-with-32-chars",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_BUCKET: "colaqui",
  S3_ACCESS_KEY_ID: "minioadmin",
  S3_SECRET_ACCESS_KEY: "minioadmin",
  S3_FORCE_PATH_STYLE: "true",
} satisfies Record<string, string>;

describe("parseEnv", () => {
  it.each(["DATABASE_URL", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"])(
    "reports the missing %s field",
    (field) => {
      const input: Record<string, string | undefined> = { ...validEnv };
      delete input[field];

      expect(() => parseEnv(input)).toThrow(field);
    },
  );

  it("normalizes booleans and applies media limits", () => {
    const env = parseEnv(validEnv);

    expect(env.s3.forcePathStyle).toBe(true);
    expect(env.media.maxPhotoBytes).toBe(10_485_760);
    expect(env.media.maxPhotosPerProduct).toBe(20);
  });

  it("rejects invalid integer limits instead of guessing", () => {
    expect(() => parseEnv({ ...validEnv, MAX_PHOTO_BYTES: "ten-megabytes" })).toThrow(
      "MAX_PHOTO_BYTES",
    );
  });
});
