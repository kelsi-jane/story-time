# Security Concerns

## No hardcoded personal information in source

GitHub usernames, email addresses, and any personal identifiers must never appear in committed source files — even as temporary placeholders. They belong in environment variables.

**Pattern in use:**
- `VITE_DEV_AUTH_USERNAME` — mocks the authenticated GitHub user in local dev
- `VITE_INITIAL_ADMIN_USERNAMES` — comma-separated list of seeded admin GitHub usernames (first is primary)

Both are defined in `src/web/.env.local` (gitignored). `src/web/.env.example` documents the variable names without values for self-hosters.

---

## Environment variable classification

Not all environment variables are equal. Misclassifying a secret as a build-time variable (or vice versa) creates either a security gap or a broken deployment.

| Variable | Type | Where to set | Reason |
|---|---|---|---|
| `VITE_DEV_AUTH_USERNAME` | Build-time, non-secret | `.env.local` only | Dev-only mock, never deployed |
| `VITE_INITIAL_ADMIN_USERNAMES` | Build-time, non-secret | Azure SWA app settings + `.env.local` | Baked into JS bundle at build time; usernames are not secrets |
| `GITHUB_CLIENT_ID` | Build-time, semi-public | Azure SWA app settings | Appears in OAuth redirect URLs anyway |
| `GITHUB_CLIENT_SECRET` | Runtime, **secret** | GitHub Secrets (injected via workflow `env:`) | Must be masked in logs; never baked into bundle |
| `AZURE_STORAGE_CONNECTION_STRING` | Runtime, **secret** | GitHub Secrets (injected via workflow `env:`) | Contains credentials; must be masked |

**Rule:** `VITE_*` variables are embedded in the JavaScript bundle at build time and are publicly readable. Never put secrets in `VITE_*` variables. Secrets belong in GitHub Secrets, where they are automatically masked in Actions logs.

---

## Admin whitelist

The admin whitelist currently lives in `localStorage` (mock API). This is a temporary measure — it means whitelist additions only persist per-device and per-browser. When the real API is wired up, the whitelist moves to Azure Table Storage and becomes the authoritative source.

The mock API localStorage keys are: `st-mock-stories`, `st-mock-content`, `st-mock-admins`.
