# Local Update Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar `local:update` e `local:dev` para atualizar imagens Docker, aguardar PostgreSQL/MinIO, aplicar Prisma e opcionalmente iniciar o Next.js em uma sequência única e segura.

**Architecture:** Um script Node ESM autocontido cria o `.env` apenas quando ausente, descreve uma lista determinística de subprocessos e os executa em fail-fast com argumentos constantes. O `package.json` expõe os dois comandos e o README documenta que Docker Desktop e upgrades de versão principal do PostgreSQL ficam fora do fluxo.

**Tech Stack:** Node.js 24, ESM, Docker Compose, PostgreSQL 17, MinIO, Prisma 7, pnpm/Corepack, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-30-local-update-workflow-design.md`

## Global Constraints

- Implementar em `feature/colaqui-003`, baseada em `feature/colaqui-001`.
- Nunca executar `docker compose down -v`, prune, reset, remoção de volume ou upgrade automático para PostgreSQL 18.
- Nunca sobrescrever um `.env` existente nem imprimir configuração resolvida ou segredos.
- Usar somente migrations versionadas com `prisma migrate deploy`.
- Interromper imediatamente após qualquer subprocesso com código diferente de zero.
- Manter o próprio Docker Desktop fora do escopo de atualização.

## Review Focus

- Docker indisponível deve parar antes de pull, Compose ou Prisma e mostrar ação clara ao usuário.
- `minio-init` encerra com código zero por desenho; o fluxo não pode tratá-lo como serviço permanente no `--wait`.
- `.env` existente deve permanecer byte a byte igual; `.env` novo precisa de segredo aleatório válido.
- Falha de pull, saúde, inicialização do bucket ou migration deve impedir o Next.js de iniciar.
- Windows precisa resolver `corepack.cmd`, enquanto Linux/macOS usam `corepack`, sem interpolar comandos do usuário.

---

### Task 1: Implementar o orquestrador testável

**Files:**
- Create: `scripts/local-update.mjs`
- Create: `tests/unit/scripts/local-update.test.mjs`

**Interfaces:**
- Produces: `buildLocalUpdateSteps({ startDev, platform }): UpdateStep[]`
- Produces: `ensureLocalEnv(projectRoot): { created: boolean }`
- Produces: `runLocalUpdate({ projectRoot, startDev, platform, runner }): void`

- [ ] **Step 1: Escrever testes que exigem a ordem completa, criação/preservação do `.env` e fail-fast**

Os testes importam o módulo ainda inexistente, fixam os argumentos de cada etapa, usam diretórios temporários para `.env` e um runner em memória para provar que nenhuma etapa posterior roda após falha.

- [ ] **Step 2: Executar o teste e confirmar RED**

Run: `corepack pnpm vitest run tests/unit/scripts/local-update.test.mjs --no-file-parallelism`

Expected: FAIL porque `scripts/local-update.mjs` ainda não existe.

- [ ] **Step 3: Implementar o script mínimo**

Usar `node:child_process`, `node:crypto`, `node:fs`, `node:path` e `node:url`. O entrypoint reconhece somente `--dev`; argumentos desconhecidos falham antes de efeitos. O runner real usa `spawnSync` com `stdio: "inherit"`, `cwd` na raiz e executáveis escolhidos por plataforma.

- [ ] **Step 4: Executar teste focado e suíte unitária**

Run: `corepack pnpm vitest run tests/unit/scripts/local-update.test.mjs --no-file-parallelism`

Expected: todos os testes do script PASS.

Run: `corepack pnpm test:unit`

Expected: suíte unitária inteira PASS.

- [ ] **Step 5: Commit**

```text
feat: add safe local update orchestrator
```

### Task 2: Expor os comandos e documentar o uso

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `pnpm-lock.yaml` somente se pnpm alterar metadados do pacote raiz
- Test: `tests/unit/scripts/local-update.test.mjs`

**Interfaces:**
- Produces: `corepack pnpm local:update`
- Produces: `corepack pnpm local:dev`

- [ ] **Step 1: Estender o teste para exigir os scripts exatos do `package.json`**

Esperar `local:update = node scripts/local-update.mjs` e `local:dev = node scripts/local-update.mjs --dev`.

- [ ] **Step 2: Executar o teste e confirmar RED**

Run: `corepack pnpm vitest run tests/unit/scripts/local-update.test.mjs --no-file-parallelism`

Expected: FAIL porque os scripts ainda não existem no `package.json`.

- [ ] **Step 3: Adicionar os scripts e atualizar o README**

Documentar primeira instalação, atualização diária, diferença entre imagens e Docker Desktop, preservação de volumes, PostgreSQL 17 e encerramento com `Ctrl+C`.

- [ ] **Step 4: Executar teste focado, lint e TypeScript**

Run: `corepack pnpm vitest run tests/unit/scripts/local-update.test.mjs --no-file-parallelism`

Expected: PASS.

Run: `corepack pnpm lint`

Run: `corepack pnpm typecheck`

Expected: exit 0 em cada comando.

- [ ] **Step 5: Commit**

```text
docs: expose local update commands
```

### Task 3: Provar o fluxo real e fechar a branch

**Files:**
- Modify only if verification exposes a defect in Task 1 or Task 2.

**Interfaces:**
- Consumes: `local:update` e `local:dev` das tarefas anteriores.
- Produces: evidência de execução real contra Docker, PostgreSQL, MinIO e Prisma.

- [ ] **Step 1: Executar `local:update` no ambiente real**

Run: `corepack pnpm local:update`

Expected: Compose válido, imagens verificadas/puxadas, PostgreSQL e MinIO saudáveis, `minio-init` exit 0, Prisma gerado, migrations aplicadas/status atual, exit 0.

- [ ] **Step 2: Confirmar o gate do modo dev sem deixar processo órfão**

Executar `node scripts/local-update.mjs --dev` em sessão controlada, esperar Next.js Ready e encerrar com Ctrl+C.

- [ ] **Step 3: Executar verificação completa**

Run: `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test:unit`, `corepack pnpm test:integration`, `corepack pnpm prisma validate`, `docker compose config --quiet`, `corepack pnpm build`.

Expected: todos exit 0.

- [ ] **Step 4: Revisar diff e confirmar ausência de operações destrutivas**

Buscar `down -v`, `prune`, `reset`, `rm`, `Remove-Item` e comandos de exclusão no novo script; nenhum pode existir.

- [ ] **Step 5: Commit de correções de verificação, se necessário**

```text
fix: harden local update workflow
```
