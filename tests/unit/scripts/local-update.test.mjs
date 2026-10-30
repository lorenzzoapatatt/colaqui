// @vitest-environment node

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildSpawnInvocation,
  buildLocalUpdateSteps,
  ensureLocalEnv,
  parseLocalUpdateArgs,
  runLocalUpdate,
} from "../../../scripts/local-update.mjs";

const temporaryDirectories = [];

async function makeProject() {
  const projectRoot = await mkdtemp(join(tmpdir(), "colaqui-local-update-"));
  temporaryDirectories.push(projectRoot);
  return projectRoot;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("local update workflow", () => {
  it("exposes stable package commands for update and development", async () => {
    const packageJson = JSON.parse(
      await readFile(join(import.meta.dirname, "../../../package.json"), "utf8"),
    );

    expect(packageJson.scripts).toMatchObject({
      "local:update": "node scripts/local-update.mjs",
      "local:dev": "node scripts/local-update.mjs --dev",
    });
  });

  it("pins the Compose project name so worktrees reuse the same local volumes", async () => {
    const compose = await readFile(
      join(import.meta.dirname, "../../../docker-compose.yml"),
      "utf8",
    );

    expect(compose).toMatch(/^name: colaqui$/m);
    expect(compose).toContain('"127.0.0.1:55432:5432"');
    expect(compose).toContain('"127.0.0.1:9000:9000"');
    expect(compose).toContain('"127.0.0.1:9001:9001"');
  });

  it("builds MinIO releases with the official version metadata", async () => {
    const dockerfile = await readFile(
      join(import.meta.dirname, "../../../docker/minio/Dockerfile"),
      "utf8",
    );

    expect(dockerfile).toContain(
      "github.com/minio/minio/cmd.ReleaseTag=${MINIO_VERSION}",
    );
    expect(dockerfile).toContain(
      "github.com/minio/mc/cmd.ReleaseTag=${MC_VERSION}",
    );
    expect(dockerfile.match(/go list -m -f/g)).toHaveLength(2);
  });

  it("uses the IPv4 loopback for reliable Docker Desktop storage access", async () => {
    const envExample = await readFile(
      join(import.meta.dirname, "../../../.env.example"),
      "utf8",
    );

    expect(envExample).toMatch(/^S3_ENDPOINT=http:\/\/127\.0\.0\.1:9000$/m);
  });

  it("builds the strict Windows update sequence and starts dev only on request", () => {
    expect(buildLocalUpdateSteps({ startDev: false, platform: "win32" })).toEqual([
      {
        label: "Verificando Docker Desktop",
        command: "docker",
        args: ["info"],
      },
      {
        label: "Instalando dependências",
        command: "corepack.cmd",
        args: ["pnpm", "install", "--frozen-lockfile"],
      },
      {
        label: "Validando Docker Compose",
        command: "docker",
        args: ["compose", "config", "--quiet"],
      },
      {
        label: "Atualizando imagem do PostgreSQL",
        command: "docker",
        args: ["compose", "pull", "postgres"],
      },
      {
        label: "Construindo MinIO oficial",
        command: "docker",
        args: ["compose", "build", "--pull", "minio", "minio-init"],
      },
      {
        label: "Iniciando PostgreSQL e MinIO",
        command: "docker",
        args: [
          "compose",
          "up",
          "-d",
          "--wait",
          "--wait-timeout",
          "120",
          "postgres",
          "minio",
        ],
      },
      {
        label: "Preparando bucket do MinIO",
        command: "docker",
        args: ["compose", "run", "--rm", "--no-deps", "-T", "minio-init"],
      },
      {
        label: "Gerando cliente Prisma",
        command: "corepack.cmd",
        args: ["pnpm", "prisma:generate"],
      },
      {
        label: "Aplicando migrations Prisma",
        command: "corepack.cmd",
        args: ["pnpm", "prisma", "migrate", "deploy"],
      },
      {
        label: "Verificando migrations Prisma",
        command: "corepack.cmd",
        args: ["pnpm", "prisma", "migrate", "status"],
      },
    ]);

    expect(buildLocalUpdateSteps({ startDev: true, platform: "linux" }).at(-1)).toEqual({
      label: "Iniciando Colaqui",
      command: "corepack",
      args: ["pnpm", "dev"],
    });
  });

  it("runs Windows command shims through cmd without enabling a child-process shell", () => {
    expect(
      buildSpawnInvocation(
        {
          command: "corepack.cmd",
          args: ["pnpm", "prisma:generate"],
        },
        { platform: "win32", commandShell: "C:\\Windows\\System32\\cmd.exe" },
      ),
    ).toEqual({
      command: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", "corepack.cmd", "pnpm", "prisma:generate"],
    });
  });

  it("creates a missing env with a random secret and never overwrites an existing env", async () => {
    const projectRoot = await makeProject();
    await writeFile(
      join(projectRoot, ".env.example"),
      [
        "NODE_ENV=development",
        "AUTH_RESET_SECRET=change-me-to-a-random-value-with-at-least-32-characters",
        "S3_BUCKET=colaqui",
        "",
      ].join("\n"),
      "utf8",
    );

    await expect(ensureLocalEnv(projectRoot)).resolves.toEqual({ created: true });
    const created = await readFile(join(projectRoot, ".env"), "utf8");
    expect(created).toMatch(/^AUTH_RESET_SECRET=[A-F0-9]{64}$/m);
    expect(created).toContain("S3_BUCKET=colaqui");

    await writeFile(join(projectRoot, ".env"), "CUSTOM=value\n", "utf8");
    await expect(ensureLocalEnv(projectRoot)).resolves.toEqual({ created: false });
    await expect(readFile(join(projectRoot, ".env"), "utf8")).resolves.toBe(
      "CUSTOM=value\n",
    );
  });

  it("stops immediately when one external step fails", async () => {
    const projectRoot = await makeProject();
    await writeFile(join(projectRoot, ".env.example"), "S3_BUCKET=colaqui\n", "utf8");
    const executed = [];

    await expect(
      runLocalUpdate({
        projectRoot,
        startDev: false,
        platform: "linux",
        runner(step) {
          executed.push(step.label);
          return { status: step.label === "Construindo MinIO oficial" ? 17 : 0 };
        },
      }),
    ).rejects.toThrow("Construindo MinIO oficial falhou com o código 17");

    expect(executed).toEqual([
      "Verificando Docker Desktop",
      "Instalando dependências",
      "Validando Docker Compose",
      "Atualizando imagem do PostgreSQL",
      "Construindo MinIO oficial",
    ]);
  });

  it("rejects unsupported arguments before running the workflow", () => {
    expect(parseLocalUpdateArgs([])).toEqual({ startDev: false });
    expect(parseLocalUpdateArgs(["--dev"])).toEqual({ startDev: true });
    expect(() => parseLocalUpdateArgs(["--reset"])).toThrow(
      "Argumento desconhecido: --reset",
    );
  });
});
