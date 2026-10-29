import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const positiveIntegerString = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().positive());

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  APP_URL: z.url(),
  AUTH_RESET_SECRET: z.string().min(32),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(3),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleanString.prefault("false"),
  MAX_PHOTO_BYTES: positiveIntegerString.prefault("10485760"),
  MAX_PHOTOS_PER_PRODUCT: positiveIntegerString.prefault("20"),
});

export interface ServerEnv {
  nodeEnv: "development" | "test" | "production";
  databaseUrl: string;
  appUrl: string;
  authResetSecret: string;
  s3: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
  };
  media: {
    maxPhotoBytes: number;
    maxPhotosPerProduct: number;
  };
}

export function parseEnv(input: Record<string, string | undefined>): ServerEnv {
  const parsed = serverEnvSchema.parse(input);

  return {
    nodeEnv: parsed.NODE_ENV,
    databaseUrl: parsed.DATABASE_URL,
    appUrl: parsed.APP_URL,
    authResetSecret: parsed.AUTH_RESET_SECRET,
    s3: {
      endpoint: parsed.S3_ENDPOINT,
      region: parsed.S3_REGION,
      bucket: parsed.S3_BUCKET,
      accessKeyId: parsed.S3_ACCESS_KEY_ID,
      secretAccessKey: parsed.S3_SECRET_ACCESS_KEY,
      forcePathStyle: parsed.S3_FORCE_PATH_STYLE,
    },
    media: {
      maxPhotoBytes: parsed.MAX_PHOTO_BYTES,
      maxPhotosPerProduct: parsed.MAX_PHOTOS_PER_PRODUCT,
    },
  };
}

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cachedEnv ??= parseEnv(process.env);
  return cachedEnv;
}
