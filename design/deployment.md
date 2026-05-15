# Deployment Guide

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm 9 or later (included with Node.js)

### Frontend only (current)

**1. Create your local env file**

```bash
cp src/web/.env.example src/web/.env.local
```

Edit `src/web/.env.local` and set `VITE_DEV_AUTH_USERNAME` to your GitHub username. This mocks authentication locally — without it you'll be redirected to `/unauthorized` when visiting `/admin`.

**2. Start the dev server**

```bash
cd src/web
npm install
npm run dev
```

App is available at `http://localhost:5173`. Routes, auth protection, and API calls are not emulated locally — the reader surfaces run entirely against mock data.

### Full stack (once API is wired)

Additional prerequisites:

- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)
- [Azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite) — Azure Storage emulator

**1. Start Azurite**

```bash
cd src/api
npm install
npx azurite --location .azurite --silent
```

Or use the [Azurite VS Code extension](https://marketplace.visualstudio.com/items?itemName=Azurite.azurite) — right-click the status bar item to start.

**2. Configure local API settings**

Create `src/api/local.settings.json` (not committed — contains secrets):

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true"
  }
}
```

**3. Start the API**

```bash
cd src/api
npm run start
```

Functions are available at `http://localhost:7071/api/`.

**4. Start the frontend**

```bash
cd src/web
npm run dev
```

App is available at `http://localhost:5173`. The Vite dev server proxies `/api/*` requests to the Functions host.

---

## Production Deployment

### Prerequisites

- An [Azure account](https://azure.microsoft.com/free/)
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed and logged in (`az login`)
- A GitHub account with access to this repository

### 1. Create an Azure Storage Account

```bash
az group create --name story-time-rg --location eastus

az storage account create \
  --name storytimestorage \
  --resource-group story-time-rg \
  --sku Standard_LRS \
  --kind StorageV2
```

Note the connection string — you'll need it in step 4:

```bash
az storage account show-connection-string \
  --name storytimestorage \
  --resource-group story-time-rg \
  --query connectionString \
  --output tsv
```

### 2. Create the Azure Static Web App

```bash
az staticwebapp create \
  --name story-time \
  --resource-group story-time-rg \
  --source https://github.com/<your-org>/story-time \
  --branch main \
  --app-location src/web \
  --api-location src/api \
  --output-location dist \
  --login-with-github
```

The CLI will prompt for GitHub authorisation and automatically create the GitHub Actions workflow secret `AZURE_STATIC_WEB_APPS_API_TOKEN` in your repository.

### 3. Register a GitHub OAuth App

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**
2. Fill in:
   - **Application name:** Story Time
   - **Homepage URL:** `https://<your-swa-hostname>.azurestaticapps.net`
   - **Authorization callback URL:** `https://<your-swa-hostname>.azurestaticapps.net/.auth/login/github/callback`
3. Click **Register application**
4. Copy the **Client ID** and generate a **Client Secret**

### 4. Set application settings

```bash
az staticwebapp appsettings set \
  --name story-time \
  --resource-group story-time-rg \
  --setting-names \
    GITHUB_CLIENT_ID="<your-client-id>" \
    GITHUB_CLIENT_SECRET="<your-client-secret>" \
    AZURE_STORAGE_CONNECTION_STRING="<your-connection-string>"
```

### 5. Deploy

Push to `main`. GitHub Actions picks it up automatically:

```bash
git push origin main
```

The workflow in `.github/workflows/azure-static-web-apps.yml` builds and deploys both the frontend and API. Deployment typically takes 2–3 minutes.

### 6. Verify

- Visit `https://<your-swa-hostname>.azurestaticapps.net` — reader surfaces should load
- Visit `/admin` — should redirect to GitHub OAuth login
- Authenticate and confirm the admin index loads

---

## Deployed Resources (current instance)

| Resource | Value |
|---|---|
| Azure Static Web App name | `lively-ocean-0d34a8310` |
| Hostname | `https://lively-ocean-0d34a8310.7.azurestaticapps.net` |
| GitHub repository | `kelsi-jane/story-time` |
| Workflow file | `.github/workflows/azure-static-web-apps-lively-ocean-0d34a8310.yml` |
| Deploy token secret name | `AZURE_STATIC_WEB_APPS_API_TOKEN_LIVELY_OCEAN_0D34A8310` |

---

## Environment Variables Reference

`VITE_*` variables are build-time — Vite bakes them into the JS bundle during the GitHub Actions build. They are publicly readable in the bundle and must never contain secrets. See `design/security-concerns.md` for the full classification.

| Variable | Type | Where set | Purpose |
|---|---|---|---|
| `VITE_DEV_AUTH_USERNAME` | Build-time | `.env.local` only | Mocks authenticated GitHub user in local dev |
| `VITE_INITIAL_ADMIN_USERNAMES` | Build-time | SWA app settings + `.env.local` | Comma-separated GitHub usernames seeded as admins; first is primary |
| `GITHUB_CLIENT_ID` | Build-time | SWA app settings | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | Runtime, **secret** | GitHub Secrets → workflow `env:` | GitHub OAuth app client secret |
| `AZURE_STORAGE_CONNECTION_STRING` | Runtime, **secret** | GitHub Secrets → workflow `env:` | Blob + Table Storage access |
| `AzureWebJobsStorage` | Local only | `local.settings.json` | Functions local storage binding |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_*` | CI/CD | GitHub repository secret | SWA deployment token |

---

## Notes

- `local.settings.json` is git-ignored — never commit it
- `.azurite/` is git-ignored — local storage emulator data
- The SWA free tier supports one deployment environment; pull request preview environments require Standard tier
- `VITE_INITIAL_ADMIN_USERNAMES` must be set in Azure SWA app settings before deploying — without it the admin whitelist is empty and no one can log in

---

## Media Assets

### Story cover images

Both the discovery card and the story title page use the same `coverImageUrl` field. Both containers use a **3:2 aspect ratio** with `object-fit: cover` (center-cropped to fill).

**Recommended size:** 1200×800px (3:2 landscape)

**Current implementation:** external URL — the admin enters a direct image URL in the story edit form. No upload infrastructure is required. Images are served from wherever the URL points.

**Phase 2:** self-hosted upload via Azure Blob Storage. See the backlog entry "Self-Hosted Image Upload (Phase 2)" for implementation details. When Phase 2 ships, existing external URLs continue to work — migration is optional per story.

**Implications for authors:**
- Keep the primary subject centered — edges may be cropped on smaller viewports
- A single image works for both the title page and the discovery card; no separate thumbnail is needed
- The ratio may be adjusted in a future release — the admin field accepts any URL, so re-pointing to a new image requires only editing the story record

---

## Chapter Content (Blob Storage)

### Container setup

Chapter content is stored in a private Azure Blob Storage container. Create it once before deploying:

```bash
az storage container create \
  --name chapter-content \
  --account-name storytimestorage \
  --resource-group story-time-rg \
  --public-access off
```

### How content is served

The Azure Function at `GET /api/chapters/{id}/content` fetches the blob at key `{id}.md` from the `chapter-content` container and streams it to the reader. The container is private — the Function is the only path to the content.

When an admin saves a chapter via the editor, `PUT /api/chapters/{id}/content` uploads the markdown to the same key. The chapter's `blobPath` in the story metadata is updated to `/api/chapters/{id}/content`.

### Seeded chapter migration

Chapters in the initial seed (`ch1`–`ch5` for The Silver Thread, etc.) still use static file paths (`/content/...`) served by SWA's static hosting. They migrate automatically: when an admin opens and re-saves any seeded chapter, the content is uploaded to blob and `blobPath` is updated. No bulk migration script is required.

### Local full-stack development

Full-stack dev (including chapter content) requires both the Functions host and Azurite running alongside the Vite dev server:

```bash
# Terminal 1 — storage emulator (--skipApiVersionCheck works around SDK/Azurite version mismatch)
cd src/api && npx azurite --location .azurite --silent --skipApiVersionCheck

# Terminal 2 — Azure Functions
cd src/api && npm run start

# Terminal 3 — frontend (proxies /api/* to localhost:7071)
cd src/web && npm run dev
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:7071` automatically. Frontend-only dev (without running the Functions) still works for UI work — seeded chapters load from static files as before.
