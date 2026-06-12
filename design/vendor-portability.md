# Vendor Portability

story-time is intended to be self-hostable (see `design/high-level.md`), but today every layer of the API is wired directly to Azure. This doc inventories the current coupling and lays out a phased plan for reducing it.

## Inventory

| Layer | Files | Coupling | Effort to abstract |
|---|---|---|---|
| Functions runtime | all 9 files in `src/api/src/functions/` | High — every handler is `(HttpRequest, InvocationContext) => HttpResponseInit` registered via `app.http()` | High — needs a routing/handler shim per target platform |
| Table Storage | `lib/table-client.ts`, `functions/stories.ts`, `functions/stories-slug.ts`, `functions/story-chapters.ts` | Medium — centralized through `getTableClient()`, but raw `@azure/data-tables` types/semantics (`PartitionKey`/`RowKey`, `'Replace'`/`'Merge'`) leak into call sites | Low–Medium |
| Blob Storage | `lib/event-store.ts`, `functions/chapter-content.ts`, `functions/user-preferences.ts`, `functions/planning.ts` | Medium — each file builds its own `BlobServiceClient.fromConnectionString(...)` | Low–Medium |
| Auth (SWA) | `src/web/src/api/auth.ts`, `lib/table-client.ts` (`getCallerUsername`/`isAdmin`), `staticwebapp.config.json`, SWA Role management | High — `/.auth/me`, `x-ms-client-principal`, and per-instance Portal role invites are SWA-specific platform features | High |
| IaC | none | N/A — `design/deployment.md` is manual Azure CLI steps | Out of scope for now |

Dev-only tooling (`src/api/src/seed.ts`, `src/api/src/sync.ts`) also talks to Azure storage directly. These aren't part of the deployed runtime and are excluded from this effort.

## Phased Roadmap

**Phase 1 (this PR) — Storage abstraction.** Introduce `DocumentStore`/`BlobStore` interfaces under `src/api/src/lib/storage/`, with an Azure-only implementation (`AzureDocumentStore`/`AzureBlobStore`) behind a small factory. All Table/Blob call sites in the deployed API move behind these interfaces. No behavior change; a future contributor could add an AWS (DynamoDB/S3) or Cloudflare (D1/R2 or KV) adapter without touching handler logic.

**Phase 2 (future) — Auth abstraction.** Wrap `getCallerUsername`/role checks behind an `AuthProvider` interface so a non-SWA host can supply identity another way (e.g. JWT/session middleware). The frontend's `auth.ts` would need a parallel abstraction for `/.auth/me` and role lookups. Higher risk than Phase 1 because SWA's role-management UI has no direct equivalent on other platforms.

**Phase 3 (future, largest) — Functions runtime.** Only worth doing once a second target platform is actually being built. Until then, keep handler bodies thin and storage/auth-interface-driven (per Phases 1–2) so the bulk of business logic is portable even if the routing shell (`app.http()`) isn't.

**IaC — deferred.** Not prioritized currently. Revisit once a second cloud target is real; until then Terraform would just codify Azure-only resources that `design/deployment.md` already documents procedurally.
