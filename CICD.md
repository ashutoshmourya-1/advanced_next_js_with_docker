# CI/CD Pipeline Documentation

> **Project:** Advanced Next.js with Docker  
> **Runner:** Self-hosted GitHub Actions runner  
> **Stack:** Next.js · Express (Node.js) · PostgreSQL · Caddy · Docker

---

## Table of Contents

1. [Overview](#overview)
2. [Infrastructure](#infrastructure)
3. [Local Safeguards (Git Hooks)](#local-safeguards-git-hooks)
4. [Pipeline 1 — CI + Preview Deployment](#pipeline-1--ci--preview-deployment)
5. [Pipeline 2 — Preview Cleanup](#pipeline-2--preview-cleanup)
6. [Pipeline 3 — Production Deployment](#pipeline-3--production-deployment)
7. [Secrets Reference](#secrets-reference)
8. [Rollback Steps](#rollback-steps)
9. [Running Scripts Manually](#running-scripts-manually)

---

## Overview

The project uses **three GitHub Actions workflows** and **two Husky git hooks** forming a full development-to-production pipeline.

```
Developer machine
  └── git commit  →  [Husky pre-commit]  lint both apps
  └── git push    →  [Husky pre-push]    build both apps

Pull Request opened / updated
  └── [ci.yml]
        ├── CI job (matrix: next_js + node_js)
        │     ├── Install deps
        │     ├── Lint
        │     └── Test
        └── Preview Deployment job (only if CI passes)
              ├── Generate .env files
              ├── start-preview.sh  →  Docker build + Caddy route
              └── Post preview URL as PR comment

Pull Request closed (any reason)
  └── [preview-cleanup.yml]
        └── stop-preview.sh  →  Remove containers, images, volumes, networks, Caddy route

Pull Request merged → main
  └── [production.yml]
        ├── Generate .env files
        └── deploy-production.sh  →  Pull code + rebuild + restart
```

---

## Infrastructure

Long-lived infrastructure is managed separately from PR preview stacks and is started once on the host.

**File:** [`docker-compose.infrastructure.yml`](./docker-compose.infrastructure.yml)

| Service | Image | Purpose | Network |
|---|---|---|---|
| `postgres` | `postgres:18-alpine` | Shared database for all preview environments | `preview_backend` |
| `caddy` (`preview-caddy`) | `caddy:2-alpine` | Reverse proxy — dynamically routes `pr-<N>.localhost` to the correct Next.js container | `preview_proxy` |

**Key details:**
- Caddy exposes its **Admin API on port 2019** (`0.0.0.0:2019`) so scripts can add/remove routes without restarting the container.
- `auto_https off` is set in [`Caddyfile`](./Caddyfile) since this is a local/internal preview environment.
- Both networks (`preview_proxy`, `preview_backend`) are declared as **external** in the per-PR `docker-compose.yml`, so PR stacks attach to the shared infrastructure.

**Starting infrastructure manually:**

```bash
docker compose -f docker-compose.infrastructure.yml up -d
```

---

## Local Safeguards (Git Hooks)

Managed by **Husky**. These run on the developer's machine before code ever reaches GitHub.

### `pre-commit` — Lint both apps

**File:** [`.husky/pre-commit`](./.husky/pre-commit)  
**Trigger:** Every `git commit`

```sh
pnpm --dir advanced_next_js lint
pnpm --dir node_js lint
```

- Runs ESLint on both `advanced_next_js/` and `node_js/`.
- If either fails, the commit is **blocked**.

### `pre-push` — Build both apps

**File:** [`.husky/pre-push`](./.husky/pre-push)  
**Trigger:** Every `git push`

```sh
pnpm --dir advanced_next_js build
pnpm --dir node_js build
```

- Ensures the code compiles before it reaches the remote.
- If either build fails, the push is **blocked**.

> [!TIP]
> To bypass hooks in an emergency: `git commit --no-verify` / `git push --no-verify`. Use carefully.

---

## Pipeline 1 — CI + Preview Deployment

**File:** [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)  
**Trigger:** Pull Request — `opened`, `synchronize`, `reopened`  
**Runner:** `self-hosted`

This workflow has two sequential jobs.

---

### Job 1: `ci` — Continuous Integration

Runs in **parallel matrix** across both sub-projects simultaneously.

| Matrix project | `path` |
|---|---|
| `next_js` | `advanced_next_js/` |
| `node_js` | `node_js/` |

#### Steps

| # | Step | Details |
|---|---|---|
| 1 | **Checkout** | `actions/checkout@v7` |
| 2 | **Set up Node** | `actions/setup-node@v7` — Node 24 |
| 3 | **Install pnpm** | `pnpm/setup@v2` — pnpm 11 |
| 4 | **Install dependencies** | `pnpm install --frozen-lockfile` in the project path |
| 5 | **Lint** | `pnpm lint` |
| 6 | **Test** | `pnpm test` — skipped gracefully if no `test` script exists in `package.json` |
| 7 | **Notify Slack** | `if: failure()` — posts a failure message with PR details and logs link to the Slack webhook |

**`fail-fast: false`** is set so both matrix legs always run and report independently — a failure in one does not cancel the other.

#### Failure Notification Format

```
🚨 CI Failed (next_js / node_js)
Repo: <owner>/<repo>
PR: #<N> — <title>
Branch: <branch>
Commit: <sha>
Triggered by: <actor>
Logs: <url>
```

---

### Job 2: `preview` — Preview Deployment

**Depends on:** `ci` (both matrix legs must succeed)  
**Condition:** `needs.ci.result == 'success'`

#### Steps

| # | Step | Details |
|---|---|---|
| 1 | **Checkout** | `actions/checkout@v7` |
| 2 | **Set up Node + pnpm** | Same as CI job |
| 3 | **Generate .env files** | Writes three `.env` files from GitHub Secrets (see [Secrets Reference](#secrets-reference)) |
| 4 | **Start PR preview** | `./scripts/start-preview.sh <PR_NUMBER>` |
| 5 | **Comment preview URL** | Posts / updates a bot comment on the PR with the preview URL |
| 6 | **Notify Slack on failure** | Posts failure details to Slack webhook |

#### `start-preview.sh` — What it does

**File:** [`scripts/start-preview.sh`](./scripts/start-preview.sh)

Given a PR number `N`, the script:

1. **Pre-flight checks** — verifies `preview-caddy` and `postgres` containers are running; exits with error if not.
2. **Caddy Admin API check** — polls the Admin API for up to 15 seconds.
3. **HTTP server check** — creates the Caddy HTTP server (`srv0` on `:80`) if it doesn't exist yet.
4. **Docker build** — runs `docker compose -p pr-<N> up -d --build`, which builds and starts:
   - `pr-<N>-next_js-1` — Next.js app (port 3000)
   - `pr-<N>-node_js-1` — Express API
5. **Health check** — polls the Node.js container's Docker health status (up to 30 attempts × 2s).
6. **Next.js readiness** — polls port 3000 on the Next.js container via `nc` from inside the Caddy container.
7. **HTTP readiness** — `wget` the Next.js root endpoint to confirm HTTP responses.
8. **Caddy route** — registers a route in Caddy via the Admin API:
   - **Route ID:** `pr-<N>` (used for idempotent updates and cleanup)
   - **Match:** `Host: pr-<N>.localhost`
   - **Handle:** reverse proxy → `pr-<N>-next_js-1:3000` with 3 retries and 10s timeout
   - Removes any existing route for the same PR before adding (idempotent re-deployments).
9. **Caddy route verification** — confirms the route exists in Caddy config.
10. **Preview URL** — outputs `preview_url=http://pr-<N>.localhost` to `$GITHUB_OUTPUT`.

#### PR Comment Behaviour

The GitHub Script step is **idempotent**:
- If a bot comment containing "Preview deployed!" already exists on the PR → it **updates** it.
- Otherwise → it **creates** a new comment.

This avoids comment spam on `synchronize` events.

---

## Pipeline 2 — Preview Cleanup

**File:** [`.github/workflows/preview-cleanup.yml`](./.github/workflows/preview-cleanup.yml)  
**Trigger:** Pull Request — `closed` (covers both merged and abandoned PRs)  
**Runner:** `self-hosted`

#### Steps

| # | Step | Details |
|---|---|---|
| 1 | **Checkout** | `actions/checkout@v7` |
| 2 | **Generate .env files** | Same as CI workflow (needed for Docker compose context) |
| 3 | **Remove PR preview** | `./scripts/stop-preview.sh <PR_NUMBER>` |
| 4 | **Notify Slack on failure** | Posts failure details to Slack |

#### `stop-preview.sh` — What it does (10 steps)

**File:** [`scripts/stop-preview.sh`](./scripts/stop-preview.sh)

| Step | Action |
|---|---|
| 1 | **Remove Caddy route** — `DELETE /id/pr-<N>` via Admin API. Gracefully skipped if Caddy is not running. |
| 2 | **Verify route removed** — Checks Admin API to confirm route is gone. **Exits with error** if route still exists. |
| 3 | **Remove Docker stack** — `docker compose -p pr-<N> down --remove-orphans --volumes --timeout 10` |
| 4 | **Remove leftover containers** — Finds and force-removes any containers matching `pr-<N>-*` |
| 5 | **Remove leftover networks** — Finds and removes networks matching `pr-<N>_*` |
| 6 | **Remove PR images (by tag)** — Removes images matching `pr-<N>-*` |
| 7 | **Remove PR image IDs** — Deep-inspects all images to catch untagged leftover image IDs |
| 8 | **Remove PR volumes** — Removes volumes matching `pr-<N>_*` |
| 9 | **Prune dangling artifacts** — `docker image prune -f`, `docker container prune -f`, `docker network prune -f` |
| 10 | **Final verification** — Re-checks containers, images, networks, volumes, and Caddy route. Sets `CLEANUP_FAILED=1` and exits with error if anything remains. |

> [!IMPORTANT]
> Step 2 is a hard gate — if the Caddy route was not removed, the script aborts rather than leaving a broken routing state.

---

## Pipeline 3 — Production Deployment

**File:** [`.github/workflows/production.yml`](./.github/workflows/production.yml)  
**Trigger:** Pull Request `closed` **AND** targeting `main` branch **AND** `merged == true`  
**Runner:** `self-hosted`

> [!NOTE]
> Both `preview-cleanup.yml` and `production.yml` trigger on `pull_request: closed`. The production workflow additionally filters on `branches: [main]` and the `merged == true` condition, so it only runs for actual merges to main.

#### Steps

| # | Step | Details |
|---|---|---|
| 1 | **Checkout** | `actions/checkout@v7` |
| 2 | **Generate .env files** | Writes `advanced_next_js/.env`, `node_js/.env`, and root `.env` from secrets |
| 3 | **Deploy production** | `./scripts/deploy-production.sh` |
| 4 | **Notify Slack on failure** | Posts merge commit SHA and failure details to Slack |

#### `deploy-production.sh` — What it does

**File:** [`scripts/deploy-production.sh`](./scripts/deploy-production.sh)

> [!WARNING]
> The production deployment script currently has its commands **commented out** — it is a scaffold awaiting a `docker-compose.production.yml` file. The steps below reflect the intended sequence.

Intended steps (currently stubbed):

```bash
# 1. Pull latest code
git fetch origin main
git checkout main
git reset --hard origin/main

# 2. Build production images
docker compose -f docker-compose.production.yml build

# 3. Stop old containers
docker compose -f docker-compose.production.yml down --remove-orphans

# 4. Start new containers
docker compose -f docker-compose.production.yml up -d

# 5. Verify running containers
docker compose -f docker-compose.production.yml ps
```

#### Failure Notification Format

```
🚨 Production Deployment Failed
Repo: <owner>/<repo>
PR: #<N>
Merge Commit: <sha>
Triggered by: <actor>
Logs: <url>
```

---

## Secrets Reference

The following secrets must be configured in the GitHub repository settings (`Settings → Secrets → Actions`).

| Secret | Used in | Description |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_API_URL` | CI, Preview, Production | Public URL of the Express backend |
| `NEXT_PUBLIC_PORT` | CI, Preview, Production | Port exposed by the Next.js container |
| `PORT` | CI, Preview, Production | Express server port |
| `POSTGRES_PORT` | CI, Preview, Production | PostgreSQL port |
| `POSTGRES_USER` | CI, Preview, Production | PostgreSQL username |
| `POSTGRES_PASSWORD` | CI, Preview, Production | PostgreSQL password |
| `POSTGRES_DB` | CI, Preview, Production | PostgreSQL database name |
| `NEXT_JS_PORT` | CI, Preview | Port mapping for Next.js in Docker |
| `NODE_JS_PORT` | CI, Preview | Port mapping for Express in Docker |
| `CADDY_PORT` | CI, Preview | Caddy HTTP port |
| `CADDY_PORT_2` | CI, Preview | Caddy Admin/HTTPS port |
| `SLACK_WEBHOOK_URL` | All workflows | Incoming webhook URL for Slack failure alerts |

---

## Rollback Steps

### Preview environment is broken after re-deploy

The preview deployment is idempotent. Simply push a new commit to the PR — the `synchronize` event will:
1. Re-run CI.
2. Remove the old Caddy route (`start-preview.sh` deletes the existing route ID before re-adding).
3. Rebuild and restart the Docker stack (`docker compose up -d --build`).

### Preview cleanup failed — containers/routes left behind

Run the cleanup script manually on the self-hosted runner:

```bash
./scripts/stop-preview.sh <PR_NUMBER>
```

If Caddy route removal fails, delete it directly:

```bash
curl -X DELETE http://127.0.0.1:2019/id/pr-<PR_NUMBER>
```

Then remove Docker resources manually:

```bash
docker compose -p pr-<PR_NUMBER> down --remove-orphans --volumes
docker ps -a --filter "name=pr-<PR_NUMBER>-" -q | xargs docker rm -f
docker images --format "{{.Repository}}:{{.Tag}}" | grep "^pr-<PR_NUMBER>-" | xargs docker rmi -f
```

### Production deployment failed

Since the production deploy script runs on the self-hosted runner with the checked-out code:

1. **Check the Actions logs** for which step failed.
2. **SSH into the runner** and run the failed command manually to see the full output.
3. **Re-run the workflow** from the GitHub Actions UI (the `Re-run all jobs` button) once the root cause is fixed.
4. If containers are in a bad state, stop and restart them:

```bash
docker compose -f docker-compose.production.yml down --remove-orphans
docker compose -f docker-compose.production.yml up -d --build
```

5. To roll back to a previous commit:

```bash
git fetch origin main
git reset --hard <previous-commit-sha>
docker compose -f docker-compose.production.yml up -d --build
```

### Infrastructure is down (Caddy or Postgres not running)

Restart shared infrastructure:

```bash
docker compose -f docker-compose.infrastructure.yml up -d
```

This will not affect existing PR containers since they attach to the shared networks externally.

---

## Running Scripts Manually

All scripts require a PR number argument.

```bash
# Start a preview for PR #42
./scripts/start-preview.sh 42

# Stop and clean up a preview for PR #42
./scripts/stop-preview.sh 42

# Run production deployment
./scripts/deploy-production.sh
```

> [!NOTE]
> `start-preview.sh` requires Caddy (`preview-caddy`) and Postgres to already be running. Start infrastructure first if needed.

