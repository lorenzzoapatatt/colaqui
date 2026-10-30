import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function corepackCommand(platform) {
  return platform === "win32" ? "corepack.cmd" : "corepack";
}

export function buildLocalUpdateSteps({ startDev, platform }) {
  const corepack = corepackCommand(platform);
  const steps = [
    {
      label: "Verificando Docker Desktop",
      command: "docker",
      args: ["info"],
    },
    {
      label: "Instalando dependências",
      command: corepack,
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
      command: corepack,
      args: ["pnpm", "prisma:generate"],
    },
    {
      label: "Aplicando migrations Prisma",
      command: corepack,
      args: ["pnpm", "prisma", "migrate", "deploy"],
    },
    {
      label: "Verificando migrations Prisma",
      command: corepack,
      args: ["pnpm", "prisma", "migrate", "status"],
    },
  ];

  if (startDev) {
    steps.push({
      label: "Iniciando Colaqui",
      command: corepack,
      args: ["pnpm", "dev"],
    });
  }

  return steps;
}

export async function ensureLocalEnv(projectRoot) {
  const envPath = resolve(projectRoot, ".env");
  const examplePath = resolve(projectRoot, ".env.example");

  try {
    await readFile(envPath, "utf8");
    return { created: false };
  } catch (error) {
    if (!(error instanceof Error) || !Object.hasOwn(error, "code") || error.code !== "ENOENT") {
      throw error;
    }
  }

  const template = await readFile(examplePath, "utf8");
  const secret = randomBytes(32).toString("hex").toUpperCase();
  const content = template.replace(
    /^AUTH_RESET_SECRET=.*$/m,
    `AUTH_RESET_SECRET=${secret}`,
  );

  try {
    await writeFile(envPath, content, { encoding: "utf8", flag: "wx" });
    return { created: true };
  } catch (error) {
    if (error instanceof Error && Object.hasOwn(error, "code") && error.code === "EEXIST") {
      return { created: false };
    }
    throw error;
  }
}

export function parseLocalUpdateArgs(args) {
  for (const argument of args) {
    if (argument !== "--dev") {
      throw new Error(`Argumento desconhecido: ${argument}`);
    }
  }
  return { startDev: args.includes("--dev") };
}

function defaultRunner(step, { projectRoot, platform }) {
  return spawnSync(step.command, step.args, {
    cwd: projectRoot,
    env: process.env,
    shell: platform === "win32" && step.command.endsWith(".cmd"),
    stdio: "inherit",
  });
}

export async function runLocalUpdate({
  projectRoot,
  startDev,
  platform = process.platform,
  runner = defaultRunner,
}) {
  const envResult = await ensureLocalEnv(projectRoot);
  if (envResult.created) {
    console.info("Arquivo .env criado com segredo local aleatório.");
  }

  for (const step of buildLocalUpdateSteps({ startDev, platform })) {
    console.info(`\n>> ${step.label}`);
    const result = await runner(step, { projectRoot, platform });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      if (step.label === "Verificando Docker Desktop") {
        throw new Error(
          "Docker Desktop não está disponível. Inicie-o e execute o comando novamente.",
        );
      }
      throw new Error(`${step.label} falhou com o código ${result.status}.`);
    }
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;
if (entryPoint === import.meta.url) {
  const projectRoot = resolve(import.meta.dirname, "..");
  runLocalUpdate({
    projectRoot,
    platform: process.platform,
    ...parseLocalUpdateArgs(process.argv.slice(2)),
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : "Falha na atualização local.");
    process.exitCode = 1;
  });
}
