// @vitest-environment node

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
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
        label: "Atualizando imagens Docker",
        command: "docker",
        args: ["compose", "pull", "postgres", "minio", "minio-init"],
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
        args: ["compose", "up", "--no-log-prefix", "minio-init"],
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
          return { status: step.label === "Atualizando imagens Docker" ? 17 : 0 };
        },
      }),
    ).rejects.toThrow("Atualizando imagens Docker falhou com o código 17");

    expect(executed).toEqual([
      "Verificando Docker Desktop",
      "Instalando dependências",
      "Validando Docker Compose",
      "Atualizando imagens Docker",
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
