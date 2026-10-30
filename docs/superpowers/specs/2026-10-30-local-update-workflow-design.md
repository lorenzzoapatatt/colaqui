# Atualização local de Docker, PostgreSQL e Prisma

## Intenção

Dar ao Colaqui um comando único, inspirado no fluxo do Elarahub, que prepara ou atualiza o ambiente local antes de iniciar o Next.js. O usuário não precisará executar manualmente a sequência de Docker, pnpm e Prisma em toda atualização.

## Abordagens

- **Script Node autocontido chamado pelo `package.json` — escolhida:** funciona no PowerShell sem `corepack enable`, pode ser testado com Vitest e mantém a sequência estrita do Elarahub.
- **Comandos apenas no README:** é o padrão local mais simples do Elarahub, mas repete o problema de copiar comandos e não trata falhas.
- **PowerShell puro:** combina com o Windows, mas reduz a portabilidade e exigiria uma infraestrutura separada para testes.

## Interface

O repositório oferecerá:

```powershell
node scripts/local-update.mjs
node scripts/local-update.mjs --dev
corepack pnpm local:update
corepack pnpm local:dev
```

`local:update` prepara tudo e termina. `local:dev` executa a mesma atualização e, somente depois do sucesso, mantém `next dev` aberto.

## Sequência estrita

1. Confirmar que o comando está na raiz do Colaqui.
2. Criar `.env` a partir de `.env.example` somente quando o arquivo não existir, gerando um `AUTH_RESET_SECRET` aleatório para a branch atual; nunca sobrescrever um `.env` existente.
3. Verificar que Docker Desktop/Engine está acessível; se não estiver, parar com uma mensagem curta pedindo para iniciá-lo.
4. Executar `corepack pnpm install --frozen-lockfile`.
5. Validar o Compose com `docker compose config --quiet`, sem imprimir configuração ou segredos.
6. Atualizar o PostgreSQL com `docker compose pull postgres`.
7. Compilar MinIO e `mc` a partir dos releases oficiais fixados com `docker compose build --pull minio minio-init`. Essa fonte substitui as imagens oficiais retiradas do registro sem introduzir uma imagem comunitária de terceiros.
8. Subir e aguardar apenas os serviços permanentes com `docker compose up -d --wait postgres minio`, evitando o falso erro causado pelo encerramento esperado do `minio-init`.
9. Executar `docker compose run --rm --no-deps -T minio-init` e exigir saída zero, sem deixar o menu interativo do Compose bloquear o PowerShell.
10. Executar `corepack pnpm prisma:generate`.
11. Executar `corepack pnpm prisma migrate deploy`.
12. Confirmar com `corepack pnpm prisma migrate status`.
13. Com `--dev`, executar `corepack pnpm dev` somente depois de todas as etapas anteriores.

Cada subprocesso será iniciado por argumentos, sem interpolação de shell, e qualquer código diferente de zero interromperá as etapas seguintes.

## Limites e segurança

- O script atualiza a imagem do PostgreSQL e as imagens-base usadas na compilação do MinIO; não instala nem atualiza o aplicativo Docker Desktop.
- PostgreSQL permanece fixado na versão principal `17-alpine`; o fluxo pode receber correções da versão 17, mas nunca fará upgrade automático para PostgreSQL 18.
- MinIO permanece fixado nos últimos releases oficiais selecionados e nos respectivos commits; uma mudança de release exige revisão explícita no repositório.
- A compilação valida que cada tag oficial resolve para o commit declarado antes de gerar o binário.
- O projeto Compose tem o nome fixo `colaqui`, inclusive em worktrees, para reutilizar os volumes `colaqui_postgres-data` e `colaqui_minio-data`.
- PostgreSQL, API MinIO e console MinIO são publicados somente em `127.0.0.1`, sem exposição das credenciais locais à rede.
- Os volumes permanecem intactos; o script não executa `down -v`, prune, reset ou exclusões.
- Migrations são somente as já versionadas no repositório e são aplicadas com `migrate deploy`, nunca `migrate dev`.
- O fluxo não executa `git pull`, para não misturar atualização de código com mudanças locais do usuário.

## Testes e aceite

- Teste unitário fixa a ordem exata das etapas para `local:update` e `local:dev`.
- Teste unitário prova que `.env` existente não é sobrescrito e que um novo recebe segredo aleatório válido.
- Teste unitário prova que uma etapa com falha impede todas as seguintes.
- Execução real comprova pull, saúde de PostgreSQL/MinIO, conclusão do `minio-init`, Prisma generate/deploy/status e inicialização do Next.js.
- README documenta o comando único, a diferença entre atualização de imagens e Docker Desktop, e como interromper o modo dev.

## Branch

Esta funcionalidade será implementada em `feature/colaqui-003`, independente da remoção de autenticação reservada para `feature/colaqui-002`.
