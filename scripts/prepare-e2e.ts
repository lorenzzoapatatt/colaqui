import { spawn } from "node:child_process";

import "dotenv/config";
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { Pool } from "pg";

import { getServerEnv } from "@/lib/config/env";
import {
  E2E_DATABASE_NAME,
  resolveE2EDatabaseUrl,
} from "@/lib/testing/e2e-database";

const E2E_BUCKET = "colaqui-e2e";

async function recreateDatabase(databaseUrl: string): Promise<void> {
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";
  const pool = new Pool({ connectionString: adminUrl.toString() });
  try {
    await pool.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [E2E_DATABASE_NAME],
    );
    await pool.query(`DROP DATABASE IF EXISTS "${E2E_DATABASE_NAME}"`);
    await pool.query(`CREATE DATABASE "${E2E_DATABASE_NAME}"`);
  } finally {
    await pool.end();
  }
}

async function recreateBucket(client: S3Client): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: E2E_BUCKET }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: E2E_BUCKET }));
  }

  let continuationToken: string | undefined;
  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: E2E_BUCKET,
        ContinuationToken: continuationToken,
      }),
    );
    const objects = (listed.Contents ?? []).flatMap((object) =>
      object.Key ? [{ Key: object.Key }] : [],
    );
    if (objects.length) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: E2E_BUCKET,
          Delete: { Objects: objects, Quiet: true },
        }),
      );
    }
    continuationToken = listed.NextContinuationToken;
  } while (continuationToken);
}

async function migrate(databaseUrl: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const command =
      process.platform === "win32"
        ? (process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe")
        : "pnpm";
    const args =
      process.platform === "win32"
        ? ["/d", "/s", "/c", "pnpm prisma migrate deploy"]
        : ["prisma", "migrate", "deploy"];
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Prisma migration exited with code ${code}.`)),
    );
  });
}

async function main(): Promise<void> {
  const env = getServerEnv();
  const databaseUrl = resolveE2EDatabaseUrl(
    env.databaseUrl,
    process.env.E2E_DATABASE_URL,
  );
  await recreateDatabase(databaseUrl);
  const s3 = new S3Client({
    endpoint: env.s3.endpoint,
    region: env.s3.region,
    forcePathStyle: env.s3.forcePathStyle,
    credentials: {
      accessKeyId: env.s3.accessKeyId,
      secretAccessKey: env.s3.secretAccessKey,
    },
  });
  await recreateBucket(s3);
  s3.destroy();
  await migrate(databaseUrl);
  console.info("Ambiente E2E isolado preparado.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha ao preparar E2E.");
  process.exitCode = 1;
});
