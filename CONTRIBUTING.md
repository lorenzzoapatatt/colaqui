# Contribuindo com o Colaqui

## Branches

O projeto usa uma sequência numérica única e crescente:

- `feature/colaqui-NNN` para funcionalidades;
- `fix/colaqui-NNN` para correções.

Um número nunca é reutilizado, mesmo quando o prefixo muda. A primeira branch é `feature/colaqui-001`.

## Commits e revisão

- Use commits convencionais como `feat:`, `fix:`, `test:`, `docs:` e `chore:`.
- Faça mudanças pequenas, testadas e revisáveis.
- Execute `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` e `pnpm build` antes de abrir um pull request.
- Nunca faça push direto de uma funcionalidade ou correção para `main`.
- Abra o pull request a partir da branch numerada e só faça merge depois de o CI passar.

## Dados e segredos

O repositório é público. Nunca inclua `.env`, tokens OAuth, senhas, cookies, fotos pessoais, dumps de banco ou credenciais de PostgreSQL, MinIO e S3.

Os testes E2E podem recriar exclusivamente o banco `colaqui_e2e` e o bucket `colaqui-e2e`. Não aponte `E2E_DATABASE_URL` para dados reais.
