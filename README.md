# Colaqui

Aplicativo pessoal e de proprietário único para cadastrar uma coisa usada uma só vez e preparar sua venda em vários canais. Não é um marketplace de compra e não possui cadastro público de vendedores.

## O que existe nesta branch

A `feature/colaqui-001` entrega:

- acesso seguro para um único proprietário, com Argon2id, sessões revogáveis e limite de tentativas;
- catálogo de produtos pessoais com preço em centavos, versão otimista e arquivamento;
- fotos privadas em MinIO ou S3, normalizadas com Sharp e entregues por URL assinada;
- PostgreSQL 17 com Prisma ORM e migrações;
- interface responsiva em Next.js 16, React 19 e TypeScript;
- testes unitários, de integração com PostgreSQL/MinIO e E2E no Chromium;
- CI no GitHub Actions.

As integrações de publicação ainda não estão nesta branch. O roadmap prevê Mercado Livre por API oficial, OLX quando houver credenciais/API elegíveis e fluxos assistidos para Enjoei e Facebook Marketplace. Não será usada automação que viole termos de uso ou contorne ausência de API oficial.

O desenho aprovado está em [`docs/superpowers/specs/2026-10-29-colaqui-design.md`](docs/superpowers/specs/2026-10-29-colaqui-design.md) e o plano desta branch em [`docs/superpowers/plans/2026-10-29-colaqui-001-foundation-catalog.md`](docs/superpowers/plans/2026-10-29-colaqui-001-foundation-catalog.md).

## Pré-requisitos

- Git;
- Node.js 24.14.x;
- pnpm 11.25.x via Corepack;
- Docker Desktop com Docker Compose;
- Cursor, opcional, para continuar programando.

## Instalação local no Windows

```powershell
cd C:\Users\loren\source\repos\lorenzzoapatatt\colaqui
git switch feature/colaqui-001
corepack pnpm local:dev
```

O comando `local:dev` cria o `.env` somente se ele ainda não existir, instala as dependências, valida o Compose, atualiza as imagens do PostgreSQL 17 e do MinIO, aguarda os serviços ficarem saudáveis, prepara o bucket, gera o Prisma Client, aplica e verifica as migrations e então inicia o Next.js. Ele não exige `corepack enable` nem permissões administrativas.

Abra [http://localhost:3000/setup](http://localhost:3000/setup) para criar o único proprietário. Depois disso, o cadastro é fechado e os próximos acessos usam `/login`.

O PostgreSQL local é exposto em `localhost:55432`, pois as portas 5432 e 5433 já podem estar ocupadas no Windows. O console do MinIO fica em [http://localhost:9001](http://localhost:9001), usando apenas as credenciais locais documentadas no `.env.example`.

## Abrir no Cursor

O repositório já está na pasta de projetos solicitada. Execute:

```powershell
cursor C:\Users\loren\source\repos\lorenzzoapatatt\colaqui
```

Confirme que o Cursor mostra a branch `feature/colaqui-001` antes de editar.

## Comandos principais

```powershell
corepack pnpm local:update       # atualiza Docker/PostgreSQL/MinIO e Prisma
corepack pnpm local:dev          # atualiza tudo e inicia o Next.js
corepack pnpm dev                # inicia somente o servidor Next.js
corepack pnpm lint               # ESLint
corepack pnpm typecheck          # TypeScript estrito
corepack pnpm test:unit          # testes rápidos
corepack pnpm test:integration   # PostgreSQL e MinIO reais
corepack pnpm test:e2e           # recria colaqui_e2e/colaqui-e2e e usa Chromium
corepack pnpm build              # build de produção
```

### O que o atualizador modifica

`local:update` executa `docker compose pull` e pode receber correções das imagens `postgres:17-alpine`, `minio/minio:latest` e `minio/mc:latest`. A versão principal do PostgreSQL permanece 17 e os volumes com banco e fotos não são apagados. O programa Docker Desktop não é atualizado por esse comando; atualize-o pela própria interface do Docker Desktop.

Se Docker Desktop não estiver iniciado, o comando para imediatamente com uma orientação. Depois de iniciá-lo, execute `corepack pnpm local:dev` novamente. Para encerrar o Next.js, pressione `Ctrl+C`.

O E2E nunca apaga o banco `colaqui` nem o bucket `colaqui`; ele opera somente em `colaqui_e2e` e `colaqui-e2e`.

## Recuperar a senha localmente

O comando administrativo exige acesso ao ambiente local, o e-mail do proprietário, a nova senha e confirmação do segredo configurado. Ele revoga todas as sessões e não imprime valores secretos.

```powershell
$env:OWNER_EMAIL="seu-email@example.com"
$env:OWNER_NEW_PASSWORD="uma-nova-senha-com-12-caracteres"
$env:AUTH_RESET_SECRET_CONFIRM=$env:AUTH_RESET_SECRET
pnpm owner:reset-password
Remove-Item Env:OWNER_EMAIL, Env:OWNER_NEW_PASSWORD, Env:AUTH_RESET_SECRET_CONFIRM
```

O comando lê `AUTH_RESET_SECRET` do arquivo `.env`; use em `AUTH_RESET_SECRET_CONFIRM` exatamente o mesmo valor.

## Branches

O projeto usa uma sequência única: `feature/colaqui-NNN` para funcionalidades e `fix/colaqui-NNN` para correções. Números nunca são reutilizados. Veja [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

[MIT](LICENSE). Nunca envie `.env`, tokens, fotos pessoais ou dumps de banco para este repositório público.
