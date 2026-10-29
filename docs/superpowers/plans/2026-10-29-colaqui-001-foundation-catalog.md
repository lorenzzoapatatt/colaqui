# Colaqui 001 Foundation and Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first working Colaqui vertical slice: a secure single-owner Next.js application that stores personal used products and processed photos in PostgreSQL plus MinIO/S3.

**Architecture:** Build one modular Next.js App Router application with domain and infrastructure modules kept outside React components. PostgreSQL/Prisma owns metadata and state; an S3-compatible adapter owns binaries. This branch establishes the interfaces later branches will use for assisted publishing, the worker, and official marketplace connectors.

**Tech Stack:** Node.js 24.14.0, pnpm 11.25.0, TypeScript 6.0.3, Next.js 16.4.3, React 19.3.1, PostgreSQL 17, Prisma 7.10.1, MinIO/S3, Zod 4.6.7, Sharp 0.35.5, Vitest 5.0.5, Testing Library 16.3.3, Playwright 1.64.1, Tailwind CSS 4.3.3.

**Spec:** `docs/superpowers/specs/2026-10-29-colaqui-design.md`

## Global Constraints

- Work only on branch `feature/colaqui-001`; never commit this feature directly to `main`.
- Future branches use one monotonically increasing project-wide sequence: `feature/colaqui-NNN` for functionality and `fix/colaqui-NNN` for bug fixes; numbers are never reused across the two prefixes.
- The repository stays public and MIT licensed; no real credentials, tokens, personal data, uploaded media, or `.env` files may be committed.
- The application is single-owner, Portuguese-Brazilian, sell-only, and each product starts with quantity `1`.
- Money is stored as integer centavos; IDs are UUIDs; timestamps are UTC in storage and localized only for display.
- Accept only JPEG, PNG, and WebP photos, at most 20 per product and 10 MiB per input file.
- MinIO is the development object store; production code must use the same `ObjectStorage` interface with any S3-compatible provider.
- Archive is logical. A product with active listings cannot be archived, and destructive object cleanup is not part of this branch.
- Use TDD for domain and application code. Every task ends with lint, type, test, or build evidence and an atomic commit.

## Review Focus

- Two simultaneous first-owner setup requests must create exactly one owner; Task 4 adds the concurrent setup test.
- Five failed logins in 15 minutes must block further attempts for 15 minutes without revealing whether the email exists; Task 4 adds the rate-limit and response-shape tests.
- An oversized, malformed, or unsupported image must create neither a database row nor an object; Task 7 adds failure-cleanup tests.
- A storage failure after image processing must leave the product usable and no partial `ProductPhoto`; Task 7 adds the consistency test.
- Archiving a product with an active listing must fail without changing product state; Task 5 adds the state-transition test.

---

## Scope and branch roadmap

This design spans several independently reviewable subsystems, so it is intentionally split across branches and plans:

| Branch | Deliverable |
| --- | --- |
| `feature/colaqui-001` | Foundation, owner authentication, product catalog, MinIO/S3 photos, dashboard shell, CI and local documentation |
| `feature/colaqui-002` | Assisted publishing for Enjoei and Facebook, copy/share/ZIP workflow |
| `feature/colaqui-003` | Multichannel listing state machine, PostgreSQL job queue, worker, retries and coordinated closure |
| `feature/colaqui-004` | Mercado Livre Brasil OAuth, dynamic categories/attributes, publication and sale events |
| `feature/colaqui-005` | OLX configuration shell, security/observability hardening and deployment documentation |

Bug fixes use the next unused project number, for example `fix/colaqui-006` after the five feature branches above. This document plans only `feature/colaqui-001`.

## File map for this branch

### Project and operations

- `package.json`, `pnpm-lock.yaml`: scripts and exact dependency graph.
- `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`: build configuration.
- `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`: test configuration.
- `docker-compose.yml`, `Dockerfile`, `.dockerignore`: local and container execution.
- `.env.example`: documented safe configuration names.
- `.github/workflows/ci.yml`: lint, typecheck, unit/integration tests and build.
- `CONTRIBUTING.md`: branch, commit, secret and pull-request conventions.
- `README.md`: local setup, Cursor opening, commands and troubleshooting.

### Application shell

- `src/app/layout.tsx`, `src/app/globals.css`: application shell and responsive design tokens.
- `src/app/page.tsx`: authenticated dashboard.
- `src/app/api/health/route.ts`: web/database/storage health response.
- `src/components/*`: small shared visual primitives.

### Configuration and infrastructure

- `src/lib/config/env.ts`: validate and expose server environment.
- `src/lib/http/problem.ts`: stable problem response shape.
- `src/infrastructure/db/prisma.ts`: singleton Prisma client.
- `src/infrastructure/storage/object-storage.ts`: provider-independent storage contract.
- `src/infrastructure/storage/s3-object-storage.ts`: AWS SDK implementation for MinIO/S3.
- `src/infrastructure/observability/logger.ts`: structured redacting logger.

### Authentication

- `src/modules/auth/domain/*`: password, session and rate-limit rules.
- `src/modules/auth/application/*`: setup, login, logout, session lookup and password change services.
- `src/modules/auth/infrastructure/*`: Prisma-backed owner/session/login-attempt repositories.
- `src/app/api/auth/*`: authentication Route Handlers.
- `src/app/(auth)/setup/page.tsx`, `src/app/(auth)/login/page.tsx`: public owner flows.
- `src/middleware.ts`: route protection.
- `scripts/reset-owner-password.ts`: local administrative recovery.

### Products and media

- `src/modules/products/domain/*`: product types, validation, versioning and transitions.
- `src/modules/products/application/*`: create, edit, list, archive and retrieve use cases.
- `src/modules/products/infrastructure/prisma-product-repository.ts`: Prisma repository.
- `src/modules/media/domain/*`: media types and constraints.
- `src/modules/media/application/*`: upload, reorder, remove and read services.
- `src/modules/media/infrastructure/sharp-image-processor.ts`: normalization and EXIF removal.
- `src/app/api/products/**`: authenticated product/photo APIs.
- `src/app/(app)/products/**`: catalog, create, detail and edit pages.
- `src/components/products/*`: product forms, cards and photo manager.

### Persistence and tests

- `prisma/schema.prisma`, `prisma.config.ts`, `prisma/migrations/**`: schema and migration history.
- `tests/unit/**`: domain, services, route response and component tests.
- `tests/integration/**`: real PostgreSQL and MinIO tests.
- `tests/e2e/**`: browser flows.
- `tests/fixtures/**`: synthetic images and safe data.

---

### Task 1: Bootstrap the application and development contract

**Files:**
- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `playwright.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/lib/app-metadata.ts`
- Create: `tests/unit/lib/app-metadata.test.ts`
- Create: `CONTRIBUTING.md`
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Consumes: none.
- Produces: `APP_NAME: "Colaqui"`, `APP_DESCRIPTION: string`, scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:unit`, `test:integration`, `test:e2e`, `prisma:generate`, and `prisma:migrate`.

- [ ] **Step 1: Write the failing metadata test**

Create `tests/unit/lib/app-metadata.test.ts` asserting `APP_NAME === "Colaqui"` and that `APP_DESCRIPTION` contains “vender”.

- [ ] **Step 2: Run the focused test and confirm the harness fails**

Run: `pnpm vitest run tests/unit/lib/app-metadata.test.ts`

Expected: FAIL because the application and test configuration do not exist.

- [ ] **Step 3: Create the Next.js/TypeScript toolchain**

Pin the versions from this plan, set `packageManager` to `pnpm@11.25.0`, require Node `>=24.14.0 <25`, enable strict TypeScript, App Router, Tailwind, ESLint, Vitest with jsdom, Testing Library and Playwright.

- [ ] **Step 4: Add the minimal application shell and metadata**

Export `APP_NAME` and `APP_DESCRIPTION` from `src/lib/app-metadata.ts`; render a Portuguese landing/dashboard placeholder with responsive light/dark-neutral design tokens.

- [ ] **Step 5: Document the repository workflow**

In `CONTRIBUTING.md`, record the project-wide branch sequence, `feature/` versus `fix/`, conventional commits, required checks and the ban on committing secrets. In `README.md`, state that branch 001 is the foundation/catalog milestone.

- [ ] **Step 6: Verify the bootstrap**

Run: `pnpm test:unit && pnpm lint && pnpm typecheck && pnpm build`

Expected: all commands exit `0`; Next.js emits a production build.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json next.config.ts eslint.config.mjs postcss.config.mjs vitest.config.ts vitest.setup.ts playwright.config.ts src tests CONTRIBUTING.md README.md .gitignore
git commit -m "chore: bootstrap Colaqui application"
```

---

### Task 2: Add validated configuration and infrastructure health

**Files:**
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `src/lib/config/env.ts`
- Create: `src/lib/http/problem.ts`
- Create: `src/infrastructure/db/prisma.ts`
- Create: `src/infrastructure/storage/object-storage.ts`
- Create: `src/infrastructure/storage/s3-object-storage.ts`
- Create: `src/infrastructure/observability/logger.ts`
- Create: `src/modules/health/application/get-health.ts`
- Create: `src/app/api/health/route.ts`
- Test: `tests/unit/lib/config/env.test.ts`
- Test: `tests/unit/modules/health/get-health.test.ts`
- Test: `tests/integration/infrastructure/s3-object-storage.test.ts`

**Interfaces:**
- Consumes: scripts and TypeScript aliases from Task 1.
- Produces: `parseEnv(input: Record<string, string | undefined>): ServerEnv`; `ProblemDetails`; `ObjectStorage` with `put`, `getStream`, `delete`, `exists`, `createReadUrl`; `getHealth(deps: HealthDependencies): Promise<HealthReport>`.

- [ ] **Step 1: Write failing environment tests**

Assert missing `DATABASE_URL` or S3 credentials returns a field-specific validation error; assert `S3_FORCE_PATH_STYLE="true"` becomes boolean `true`; assert defaults `MAX_PHOTO_BYTES=10485760` and `MAX_PHOTOS_PER_PRODUCT=20`.

- [ ] **Step 2: Run the environment tests**

Run: `pnpm vitest run tests/unit/lib/config/env.test.ts`

Expected: FAIL because `parseEnv` is missing.

- [ ] **Step 3: Implement `parseEnv` and the safe example file**

Require `DATABASE_URL`, `APP_URL`, `AUTH_RESET_SECRET`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_FORCE_PATH_STYLE`. Keep client-visible configuration in a separate explicit object; never spread server environment into React.

- [ ] **Step 4: Write failing health and storage tests**

Test `getHealth` returns `200/ok` only when both probes pass and `503/degraded` with component names when either fails. Against MinIO, assert `put`, `exists`, `getStream`, signed read URL and `delete` operate on a synthetic object.

- [ ] **Step 5: Implement infrastructure adapters and redacting logs**

Define exact `ObjectStorage` signatures with byte streams and object metadata. Configure AWS SDK endpoint and path style from `ServerEnv`. Redact keys matching `password`, `token`, `secret`, `cookie`, or `authorization` recursively before logging.

- [ ] **Step 6: Add PostgreSQL and MinIO development services**

Use named volumes, health checks, non-production example credentials and a deterministic bucket initializer. The application must not expose MinIO credentials to the browser.

- [ ] **Step 7: Verify infrastructure**

Run: `docker compose up -d postgres minio minio-init`

Run: `pnpm vitest run tests/unit/lib/config/env.test.ts tests/unit/modules/health/get-health.test.ts tests/integration/infrastructure/s3-object-storage.test.ts`

Expected: all tests PASS; `GET /api/health` returns `200` with both components `ok` while services are healthy.

- [ ] **Step 8: Commit**

```bash
git add .env.example docker-compose.yml Dockerfile .dockerignore src tests package.json pnpm-lock.yaml
git commit -m "feat: add validated infrastructure adapters"
```

---

### Task 3: Create the Prisma domain schema and migrations

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma.config.ts`
- Create: `prisma/migrations/*_initial_domain/migration.sql`
- Create: `prisma/seed.ts`
- Create: `tests/integration/db/domain-schema.test.ts`
- Modify: `src/infrastructure/db/prisma.ts`

**Interfaces:**
- Consumes: validated `DATABASE_URL` from Task 2.
- Produces: Prisma models `Owner`, `OwnerSession`, `LoginAttempt`, `Product`, `ProductPhoto`, `ChannelConnection`, `Listing`, `ListingAttempt`, `AssistedTask`, and `Sale`; enums named exactly as the approved design states.

- [ ] **Step 1: Write the failing schema integration test**

Assert one fixed `Owner.singletonKey="OWNER"` can be inserted and a second fails uniquely; `Product.priceCents` and `quantity` persist as integers; duplicate `Listing(productId, platform)` fails; duplicate `ProductPhoto(productId, sortOrder)` fails.

- [ ] **Step 2: Run the schema test before the migration**

Run: `pnpm vitest run tests/integration/db/domain-schema.test.ts`

Expected: FAIL because Prisma client/schema is absent.

- [ ] **Step 3: Define the full approved persistence model**

Use UUID primary keys, UTC timestamps, explicit enum mappings and foreign-key delete behavior. Make products and photos logically removable with `archivedAt`/`deletedAt`; never cascade-delete object metadata from an owner/product command. Add `version Int @default(1)` to `Product` and the listing snapshot fields from the spec.

- [ ] **Step 4: Generate and apply the initial migration**

Run: `pnpm prisma:generate`

Run: `pnpm prisma migrate dev --name initial_domain`

Expected: client generation and migration succeed against the development PostgreSQL service.

- [ ] **Step 5: Run database verification**

Run: `pnpm vitest run tests/integration/db/domain-schema.test.ts`

Expected: PASS, including all uniqueness checks.

- [ ] **Step 6: Commit**

```bash
git add prisma prisma.config.ts src/infrastructure/db/prisma.ts tests/integration/db package.json pnpm-lock.yaml
git commit -m "feat: add Colaqui domain schema"
```

---

### Task 4: Implement secure single-owner authentication

**Files:**
- Create: `src/modules/auth/domain/password.ts`
- Create: `src/modules/auth/domain/session.ts`
- Create: `src/modules/auth/domain/login-rate-limit.ts`
- Create: `src/modules/auth/application/setup-owner.ts`
- Create: `src/modules/auth/application/login-owner.ts`
- Create: `src/modules/auth/application/logout-owner.ts`
- Create: `src/modules/auth/application/change-password.ts`
- Create: `src/modules/auth/application/get-current-owner.ts`
- Create: `src/modules/auth/infrastructure/prisma-auth-repository.ts`
- Create: `src/app/api/auth/setup/route.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/change-password/route.ts`
- Create: `src/app/(auth)/setup/page.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/middleware.ts`
- Create: `scripts/reset-owner-password.ts`
- Test: `tests/unit/modules/auth/*.test.ts`
- Test: `tests/integration/auth/auth-flow.test.ts`
- Test: `tests/unit/app/auth-pages.test.tsx`

**Interfaces:**
- Consumes: Prisma models from Task 3 and `ProblemDetails` from Task 2.
- Produces: `setupOwner(input: SetupOwnerInput): Promise<OwnerView>`; `loginOwner(input: LoginInput, context: LoginContext): Promise<SessionToken>`; `getCurrentOwner(rawToken?: string): Promise<OwnerView | null>`; cookie name `colaqui_session`; `requireOwner()` for Route Handlers.

- [ ] **Step 1: Write failing password and session tests**

Assert Argon2id hashes never contain the password; valid verification succeeds and invalid fails; raw session tokens are 32 random bytes encoded base64url, only SHA-256 token hashes are persisted, sessions expire after 30 days, and cookies are `HttpOnly`, `SameSite=Lax`, `Path=/`, plus `Secure` outside development.

- [ ] **Step 2: Implement password and session primitives**

Use `@node-rs/argon2` with Argon2id and `node:crypto` for session tokens/hashes. Enforce password length 12–128 characters without composition rules.

- [ ] **Step 3: Write the concurrent first-owner and rate-limit tests**

In integration tests, execute two setup requests concurrently and assert one `201`, one `409`, and one owner row. Submit five wrong passwords in a 15-minute window, assert the sixth returns generic `429` for both known and unknown email, then assert success is possible after the 15-minute block expires using an injected clock.

- [ ] **Step 4: Implement auth use cases and Prisma repository**

Use the fixed singleton key inside a transaction. Store normalized lowercase email. Record rate-limit counters by privacy-preserving IP hash plus normalized email hash. On successful login, clear the applicable counter and rotate session state on password change.

- [ ] **Step 5: Add Route Handlers, pages and middleware**

Expose setup only while no owner exists. Protect all application pages and product APIs; keep `/setup`, `/login`, `/api/auth/*`, `/api/health`, static assets and future webhook paths explicitly categorized. Return identical credential error text for unknown email and wrong password.

- [ ] **Step 6: Add the local reset command**

Implement `pnpm owner:reset-password` to require local database access, `AUTH_RESET_SECRET`, target email and a new password from environment variables. Revoke all sessions after reset and print no secret values.

- [ ] **Step 7: Verify authentication**

Run: `pnpm vitest run tests/unit/modules/auth tests/integration/auth tests/unit/app/auth-pages.test.tsx`

Expected: PASS, including concurrency and five-attempt lockout tests.

- [ ] **Step 8: Commit**

```bash
git add src/modules/auth src/app/api/auth 'src/app/(auth)' src/middleware.ts scripts tests package.json pnpm-lock.yaml
git commit -m "feat: add secure owner authentication"
```

---

### Task 5: Implement the product domain and application services

**Files:**
- Create: `src/modules/products/domain/product.ts`
- Create: `src/modules/products/domain/product-errors.ts`
- Create: `src/modules/products/domain/product-version.ts`
- Create: `src/modules/products/application/product-repository.ts`
- Create: `src/modules/products/application/create-product.ts`
- Create: `src/modules/products/application/update-product.ts`
- Create: `src/modules/products/application/get-product.ts`
- Create: `src/modules/products/application/list-products.ts`
- Create: `src/modules/products/application/archive-product.ts`
- Create: `src/modules/products/infrastructure/prisma-product-repository.ts`
- Test: `tests/unit/modules/products/product.test.ts`
- Test: `tests/unit/modules/products/product-services.test.ts`
- Test: `tests/integration/products/prisma-product-repository.test.ts`

**Interfaces:**
- Consumes: `Product` persistence from Task 3 and authenticated owner identity from Task 4.
- Produces: `ProductView`; `CreateProductInput`; `UpdateProductInput`; `ProductRepository`; use cases with `(input, deps)` signatures; `computeProductSnapshotHash(product: PublishableProduct): string`.

- [ ] **Step 1: Write failing product validation tests**

Assert titles trim to 3–120 characters, descriptions trim to 30–6000, prices accept integer centavos from `0` through `999999999`, quantity is fixed to `1`, and conditions are exactly `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`, `POOR`.

- [ ] **Step 2: Implement product parsing and stable snapshot hashing**

Use Zod for input schemas. Hash a canonical serialization of title, description, ordered photo checksums, condition, category hint, brand, location and base price; exclude timestamps and database IDs.

- [ ] **Step 3: Write failing lifecycle and optimistic-concurrency tests**

Assert `DRAFT -> READY -> LISTED -> RESERVED -> SOLD` allowed transitions, invalid transitions reject, archive is refused when `hasActiveListings(productId)` is true, and an update with stale `expectedVersion` returns a conflict without overwriting the current row.

- [ ] **Step 4: Implement use cases and repository**

Every successful publishable-field update increments `version` exactly once. Archive sets `archivedAt` and `ARCHIVED`; list excludes archived by default and supports explicit status filtering and cursor pagination.

- [ ] **Step 5: Verify product services**

Run: `pnpm vitest run tests/unit/modules/products tests/integration/products`

Expected: PASS, including the active-listing archive and stale-version tests.

- [ ] **Step 6: Commit**

```bash
git add src/modules/products tests/unit/modules/products tests/integration/products
git commit -m "feat: add product catalog domain"
```

---

### Task 6: Expose authenticated product APIs and responsive catalog pages

**Files:**
- Create: `src/app/api/products/route.ts`
- Create: `src/app/api/products/[productId]/route.ts`
- Create: `src/app/(app)/products/page.tsx`
- Create: `src/app/(app)/products/new/page.tsx`
- Create: `src/app/(app)/products/[productId]/page.tsx`
- Create: `src/app/(app)/products/[productId]/edit/page.tsx`
- Create: `src/components/products/product-form.tsx`
- Create: `src/components/products/product-card.tsx`
- Create: `src/components/products/product-status.tsx`
- Create: `src/lib/format/money.ts`
- Test: `tests/unit/app/api/products-routes.test.ts`
- Test: `tests/unit/components/products/product-form.test.tsx`
- Test: `tests/unit/lib/format/money.test.ts`

**Interfaces:**
- Consumes: `requireOwner` from Task 4 and product use cases from Task 5.
- Produces: `GET/POST /api/products`; `GET/PATCH/DELETE /api/products/:productId`; pages `/products`, `/products/new`, `/products/:id`, `/products/:id/edit`.

- [ ] **Step 1: Write failing API contract tests**

Assert unauthenticated calls return `401 ProblemDetails`; valid create returns `201` plus `ETag`/version; stale update returns `409`; invalid UUID returns `400`; missing product returns `404`; archive with active listing returns `409`.

- [ ] **Step 2: Implement thin Route Handlers**

Handlers parse input, call one application use case and map typed errors to stable problem responses. They must not import React components or issue raw Prisma calls.

- [ ] **Step 3: Write failing form and money-format tests**

Assert `12345` displays `R$ 123,45`; the form exposes Portuguese labels, condition choices and field errors; price text converts to integer centavos without floating-point arithmetic; submit includes `expectedVersion` on edit.

- [ ] **Step 4: Implement pages and product components**

Use server components for initial reads and small client components only for interactive forms. Ensure usable layouts at 360 px and desktop widths, visible focus, labeled controls and status text that does not rely on color alone.

- [ ] **Step 5: Verify product web surface**

Run: `pnpm vitest run tests/unit/app/api/products-routes.test.ts tests/unit/components/products tests/unit/lib/format/money.test.ts`

Run: `pnpm lint && pnpm typecheck && pnpm build`

Expected: all checks PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/products 'src/app/(app)/products' src/components/products src/lib/format tests/unit
git commit -m "feat: add product catalog interface"
```

---

### Task 7: Add safe photo upload, processing and ordering

**Files:**
- Create: `src/modules/media/domain/photo.ts`
- Create: `src/modules/media/application/image-processor.ts`
- Create: `src/modules/media/application/media-repository.ts`
- Create: `src/modules/media/application/upload-product-photo.ts`
- Create: `src/modules/media/application/reorder-product-photos.ts`
- Create: `src/modules/media/application/remove-product-photo.ts`
- Create: `src/modules/media/infrastructure/sharp-image-processor.ts`
- Create: `src/modules/media/infrastructure/prisma-media-repository.ts`
- Create: `src/app/api/products/[productId]/photos/route.ts`
- Create: `src/app/api/products/[productId]/photos/order/route.ts`
- Create: `src/app/api/products/[productId]/photos/[photoId]/route.ts`
- Create: `src/components/products/product-photo-manager.tsx`
- Create: `tests/fixtures/images/valid-landscape.jpg`
- Create: `tests/fixtures/images/valid-portrait-with-exif.jpg`
- Create: `tests/fixtures/images/not-an-image.jpg`
- Test: `tests/unit/modules/media/photo.test.ts`
- Test: `tests/integration/media/photo-lifecycle.test.ts`
- Test: `tests/unit/components/products/product-photo-manager.test.tsx`

**Interfaces:**
- Consumes: `ObjectStorage` from Task 2, `ProductPhoto` schema from Task 3, product/version services from Task 5.
- Produces: `ImageProcessor.normalize(input): Promise<NormalizedImage>`; `uploadProductPhoto(input, deps): Promise<ProductPhotoView>`; reorder/remove use cases; authenticated photo endpoints and `ProductPhotoManager`.

- [ ] **Step 1: Write failing file-validation tests**

Assert MIME sniffing—not filename—accepts JPEG/PNG/WebP; malformed bytes, GIF/PDF, files over 10 MiB and a 21st photo are rejected before object persistence.

- [ ] **Step 2: Implement validation and normalization**

Use Sharp to auto-orient, strip metadata and produce a normalized JPEG no larger than 2000×2000 at quality 88. Compute SHA-256 over normalized bytes. Preserve the original under a separate opaque object key and never include product titles or email in keys.

- [ ] **Step 3: Write failing lifecycle consistency tests**

Against PostgreSQL plus MinIO, assert a successful upload creates original and processed objects plus one ordered row; malformed/oversized input creates none; injected `put` failure creates no row; injected repository failure deletes newly written objects; reordering requires every active photo ID exactly once; removal marks metadata deleted and hides it without deleting objects.

- [ ] **Step 4: Implement transactional upload orchestration**

Use compensating object deletion only for objects created by the failed current request. Increment the product version after a successful photo add, reorder or logical removal. Return signed read URLs at presentation time, never persist them.

- [ ] **Step 5: Add photo APIs and manager UI**

Support multipart upload, progress state, preview, remove and accessible move-left/move-right controls usable on touch devices. Return `413` for size, `415` for type, `409` for count/order conflicts and stable problem details.

- [ ] **Step 6: Verify media behavior**

Run: `pnpm vitest run tests/unit/modules/media tests/integration/media tests/unit/components/products/product-photo-manager.test.tsx`

Expected: PASS, including all no-orphan and failure-compensation assertions.

- [ ] **Step 7: Commit**

```bash
git add src/modules/media src/app/api/products src/components/products tests/fixtures tests/unit/modules/media tests/integration/media package.json pnpm-lock.yaml
git commit -m "feat: add S3 product photo management"
```

---

### Task 8: Complete the dashboard, E2E proof, CI and handoff documentation

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/dashboard/catalog-summary.tsx`
- Create: `src/components/dashboard/recent-products.tsx`
- Create: `tests/e2e/owner-catalog.spec.ts`
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Test: `tests/unit/components/dashboard/catalog-summary.test.tsx`

**Interfaces:**
- Consumes: authenticated owner, product list and photo flows from Tasks 4–7.
- Produces: dashboard counts for `DRAFT`, `READY`, `LISTED`, `RESERVED`, `SOLD`; reproducible CI; complete local/Cursor handoff.

- [ ] **Step 1: Write the failing dashboard test**

Assert each product status count is rendered with text, zero counts are visible, archived products are excluded and the recent-products list links to details.

- [ ] **Step 2: Implement the authenticated dashboard**

Query through application services, not Prisma from components. Include clear empty state and primary “Cadastrar produto” action.

- [ ] **Step 3: Write the full E2E scenario**

The Playwright test must: complete first-owner setup, log out/in, create one used product priced in centavos, upload and reorder two synthetic photos, edit the product with expected version, verify dashboard status, archive it, and confirm it leaves the default list.

- [ ] **Step 4: Make the E2E scenario pass**

Add only missing wiring or selectors; use role/label-based selectors and a unique database/bucket namespace for the test run.

- [ ] **Step 5: Add GitHub Actions CI**

On pushes and pull requests, use Node 24 and pnpm cache, start PostgreSQL/MinIO, install with frozen lockfile, generate Prisma, apply migrations, then run lint, typecheck, unit/integration tests and production build. Run Playwright on pull requests after installing its Chromium dependency and upload the report only on failure.

- [ ] **Step 6: Finish the README and Cursor handoff**

Document prerequisites, `.env.example` copy, Docker services, migrations, owner setup/reset, all scripts, MinIO console, test commands, branch convention and the exact Windows command `cursor C:\Users\loren\source\repos\lorenzzoapatatt\colaqui`.

- [ ] **Step 7: Run the complete verification suite**

Run: `pnpm lint`

Run: `pnpm typecheck`

Run: `pnpm test:unit`

Run: `pnpm test:integration`

Run: `pnpm test:e2e`

Run: `pnpm build`

Expected: every command exits `0`; no tracked `.env`, credential, upload or generated database file is present.

- [ ] **Step 8: Audit the branch**

Run: `git diff --check origin/main...HEAD`

Run: `git status --short`

Run: `git ls-files | rg '(^|/)(\.env($|\.)|uploads?|.*\.(db|sqlite))'`

Expected: clean diff check, only intentional changes, and no secret/data matches except `.env.example` if the audit command is adjusted to display it for manual review.

- [ ] **Step 9: Commit**

```bash
git add src/app/page.tsx src/components/dashboard tests/e2e .github/workflows/ci.yml README.md CONTRIBUTING.md
git commit -m "feat: complete Colaqui catalog foundation"
```

---

## Plan completion gate

Branch 001 is complete only when:

1. all eight task commits exist on `feature/colaqui-001`;
2. the complete verification suite passes from a fresh dependency install;
3. a fresh database can be migrated and a first owner can be created exactly once;
4. the E2E test proves product and photo management end to end;
5. the branch contains no secrets or personal data;
6. the remote branch is pushed and ready for a pull request without merging directly to `main`.

