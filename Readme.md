# Docker Setup & Development Guide

This document explains the Docker setup used in this project, including:

* Docker basics
* Dockerfile
* Multi-stage builds
* Next.js containerization
* Node.js + Express containerization
* PostgreSQL containerization
* Docker Compose
* Container networking
* Environment variables
* PostgreSQL volumes
* Health checks
* `depends_on`
* Restart policies
* Distroless production images
* Husky + lint/build checks
* Common issues encountered and their solutions
* Useful Docker commands

---

# 1. What is Docker?

Docker allows us to package an application along with its runtime, dependencies, libraries, and configuration into a **container**.

Without Docker:

```text
Developer Machine
    │
    ├── Node.js version
    ├── pnpm version
    ├── PostgreSQL
    ├── System libraries
    └── Application
```

Another developer may have:

```text
Another Machine
    │
    ├── Different Node.js version
    ├── Different pnpm version
    ├── PostgreSQL missing
    └── Application
```

This can cause:

```text
"It works on my machine"
```

Docker solves this by creating a predictable environment.

```text
Docker Host
│
├── Next.js Container
│
├── Express Container
│
└── PostgreSQL Container
```

Each container has its own filesystem/process environment while containers can communicate with each other through Docker networking.

---

# 2. Docker Terminology

## Image

An image is a template used to create containers.

Example:

```text
node:24-alpine
postgres:18-alpine
```

An image contains things required to run an application.

---

## Container

A container is a running instance of an image.

For example:

```text
postgres:18-alpine
        ↓
     Container
        ↓
     postgres
```

---

## Dockerfile

A Dockerfile contains instructions for building an image.

Example:

```dockerfile
FROM node:24-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

CMD ["server.js"]
```

---

## Docker Compose

Docker Compose is used when multiple containers need to work together.

Our project contains:

```text
Next.js
   │
   │
   ├──── Express
   │       │
   │       │
   │    PostgreSQL
   │
   └──── Docker Network
```

Instead of starting every container manually, Compose can start everything together.

```bash
docker compose up
```

---

# 3. Project Architecture

The current project contains three major services:

```text
                    Docker Compose
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
      Next.js           Node.js        PostgreSQL
      :3000             :3001            :5432
          │               │
          │               │
          └─────── Docker Network ───────┘
                          │
                    next_node network
```

The services are:

| Service    | Purpose             | Internal Port |
| ---------- | ------------------- | ------------: |
| `next_js`  | Next.js frontend    |          3000 |
| `node_js`  | Express backend     |          3001 |
| `postgres` | PostgreSQL database |          5432 |

---

# 4. Why Use Multiple Containers?

Each service has a separate responsibility.

```text
Next.js
  ↓
Frontend

Express
  ↓
Backend/API

PostgreSQL
  ↓
Database
```

This gives us separation between services.

For example, PostgreSQL can be restarted without rebuilding the Next.js application.

---

# 5. What is Multi-stage Build?

A multi-stage Dockerfile allows us to use different stages for different jobs.

Our Next.js build has:

```text
base
 │
 ├── deps
 │     └── install dependencies
 │
 └── builder
       └── build application
              │
              ▼
          distroless runner
```

The important idea is:

```text
Development/build environment
            ↓
        Build application
            ↓
      Production files only
            ↓
      Small production image
```

The final container does not need:

* TypeScript
* ESLint
* Husky
* source files
* pnpm
* build tools

It only needs the files required to run the application.

---

# 6. Why `libc6-compat`?

The Next.js dependencies may contain native binaries that expect GNU C library compatibility.

Alpine Linux uses:

```text
musl libc
```

while many Node.js/native packages expect:

```text
glibc
```

Therefore:

```dockerfile
RUN apk add --no-cache libc6-compat
```

installs compatibility libraries.

This is especially useful when packages contain native binaries.

---

# 7. Why Alpine Linux?

We use:

```dockerfile
node:24-alpine
```

instead of a larger standard Node.js image.

Alpine is a lightweight Linux distribution.

Conceptually:

```text
node:24
     ↓
larger image

node:24-alpine
     ↓
smaller image
```

This helps reduce image size.

---

# 8. Why `ENV CI=true`?

In the builder stage:

```dockerfile
ENV CI=true
```

sets the environment variable:

```text
CI=true
```

This tells tools running inside the container that they are operating in a Continuous Integration environment.

This is useful because some package managers and build tools behave differently in CI.

For example, interactive prompts are generally undesirable during Docker builds.

The important distinction is:

```text
CI=true
```

does not mean Docker itself is running in CI.

It is simply an environment variable available to commands inside that image.

---

# 9. Next.js `output: "standalone"`

The Next.js configuration contains:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

The important part is:

```typescript
output: "standalone"
```

Next.js creates a standalone production output under:

```text
.next/standalone
```

This contains the files and required server-side dependencies needed to run the Next.js application.

Instead of copying the complete project and all development dependencies into the production container, we can copy:

```text
.next/standalone
.next/static
public
```

This is particularly useful for Docker deployments.

The production image becomes conceptually:

```text
Build environment
       │
       ▼
Next.js build
       │
       ▼
.next/standalone
       │
       ▼
Distroless production container
```

---

# 10. Why Distroless?

The production stage uses:

```dockerfile
FROM gcr.io/distroless/nodejs24-debian13 AS runner
```

A distroless image contains only the minimum runtime required to run the application.

It does not provide the normal Linux utilities you would expect from an Alpine/Debian image.

For example, you generally should not expect commands such as:

```bash
sh
bash
apk
apt
curl
```

to be available.

This improves the production security posture and keeps the runtime image minimal.

---

# 11. Important Difference Between Build Image and Runtime Image

The build stage:

```dockerfile
FROM node:24-alpine AS builder
```

has:

```text
Node
npm/pnpm tooling
shell
package manager
build dependencies
source code
TypeScript
ESLint
etc.
```

The production stage:

```dockerfile
FROM gcr.io/distroless/nodejs24-debian13 AS runner
```

only needs:

```text
Node runtime
+
production application files
```

Therefore:

```text
Builder
  ↓
Large
  ↓
Used only during build


Runner
  ↓
Small
  ↓
Used in production
```

---

# 12. TypeScript Build

The Express application contains:

```text
src/server.ts
```

The TypeScript compiler converts it into JavaScript.

For example:

```text
src/server.ts
      ↓
    tsc
      ↓
dist/server.js
```

The production container executes:

```dockerfile
CMD ["server.js"]
```

because `/server` contains the compiled files.

---

# 13. PostgreSQL Data Persistence

Containers are disposable.

If a PostgreSQL container is removed, its internal filesystem can disappear.

Therefore we use a Docker volume:

```yaml
volumes:
  - postgres_data:/var/lib/postgresql
```

And declare:

```yaml
volumes:
  postgres_data:
```

The data is then stored in a Docker-managed volume instead of being tied to the container filesystem.

Conceptually:

```text
PostgreSQL Container
        │
        │
        ▼
postgres_data volume
        │
        ▼
Persistent database data
```

---

# 14. PostgreSQL 18 Volume Change

An issue occurred while moving to PostgreSQL 18.

Older configurations commonly used:

```yaml
- postgres_data:/var/lib/postgresql/data
```

PostgreSQL 18 Docker images changed their recommended storage layout.

The newer configuration should use:

```yaml
- postgres_data:/var/lib/postgresql
```

This allows PostgreSQL to manage its version-specific data directory underneath that mount.

---

# 15. Docker Compose

The services are connected using Docker Compose.

Example:

```yaml
services:

  next_js:
    build:
      context: ./advanced_next_js
    container_name: next_js
    ports:
      - "3000:3000"
    networks:
      - next_node


  node_js:
    build:
      context: ./node_js
    container_name: node_js
    ports:
      - "3001:3001"
    restart: unless-stopped
    networks:
      - next_node

    environment:
      PORT: 3001
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_CONTAINER_NAME}:5432/${POSTGRES_DB}

    depends_on:
      postgres:
        condition: service_healthy


  postgres:
    image: postgres:18-alpine
    container_name: postgres
    restart: unless-stopped

    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: next_node_db

    volumes:
      - postgres_data:/var/lib/postgresql

    networks:
      - next_node


volumes:
  postgres_data:


networks:
  next_node:
```

---

# 16. Docker Networking

Docker Compose automatically provides networking between services.

If a service is named:

```yaml
postgres:
```

other containers on the same Docker network can access it using:

```text
postgres
```

They do NOT need to use the host machine IP.

For example:

```text
postgres:5432
```

is the PostgreSQL address from the Express container.

Therefore:

```text
DATABASE_URL=
postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_CONTAINER_NAME}:5432/${POSTGRES_DB}
```

works inside the Docker network.

---

# 17. Why `localhost` Does Not Work Between Containers

A common mistake is:

```text
postgresql://postgres:postgres@localhost:5432/next_node_db
```

Inside the Express container:

```text
localhost
```

means:

```text
Express container itself
```

It does NOT mean the PostgreSQL container.

Therefore:

```text
Express Container
localhost
   ↓
Express Container ❌


Express Container
postgres
   ↓
PostgreSQL Container ✅
```

---

# 18. Docker Port Mapping

Suppose PostgreSQL has:

```yaml
ports:
  - "5432:5432"
```

The format is:

```text
HOST_PORT:CONTAINER_PORT
```

Therefore:

```text
5432:5432
```

means:

```text
Host machine : 5432
       ↓
PostgreSQL container : 5432
```

For communication between containers, the host port is generally unnecessary.

Containers can communicate directly using:

```text
postgres:5432
```

---

# 19. Port 5432 Already in Use

One issue encountered was:

```text
ports are not available

listen tcp 0.0.0.0:5432:
bind: address already in use
```

This means something on the host machine was already using port `5432`.

Usually this happens when PostgreSQL is already installed/running locally.

Check:

```bash
sudo lsof -i :5432
```

You can either stop the local PostgreSQL service or change the host mapping:

```yaml
ports:
  - "5433:5432"
```

Then:

```text
Host → 5433
Container → 5432
```

However, other Docker containers should still connect to:

```text
postgres:5432
```

not:

```text
postgres:5433
```

---

# 20. PostgreSQL Health Check

PostgreSQL may start before it is actually ready to accept connections.

Therefore we use:

```yaml
healthcheck:
  test:
    [
      "CMD-SHELL",
      "pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}""
    ]
  interval: 5s
  timeout: 5s
  retries: 5
  start_period: 10s
```

`pg_isready` checks whether PostgreSQL is ready.

The lifecycle becomes:

```text
PostgreSQL container starts
        ↓
PostgreSQL initializing
        ↓
Health check fails
        ↓
Retry
        ↓
PostgreSQL ready
        ↓
Health check passes
        ↓
healthy
```

---

# 21. `depends_on` with Health Check

The Express service uses:

```yaml
depends_on:
  postgres:
    condition: service_healthy
```

This means Compose waits for PostgreSQL to become healthy before starting the Express container.

Without this:

```text
Postgres starts
      │
      ├── still initializing
      │
      └── Express starts immediately
                 │
                 ▼
           DB connection fails
```

With health checks:

```text
Postgres starts
      │
      ▼
Health check
      │
      ├── unhealthy → wait
      │
      └── healthy
            │
            ▼
       Express starts
```

---

# 22. `restart: unless-stopped`

The Express and PostgreSQL services use:

```yaml
restart: unless-stopped
```

This tells Docker to restart the container if it exits unexpectedly.

For example:

```text
Container crashes
       ↓
Docker detects exit
       ↓
Container restarted
```

It will generally remain stopped if the user explicitly stops it.

---

# 23. Health Check for Express

Express can also have its own health check.

Example:

```yaml
healthcheck:
  test: ["CMD", "node", "health_check.js"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 10s
```

The health-check script can test whether the backend is responding correctly.

Example concept:

```text
Docker
  ↓
health_check.js
  ↓
Backend status
  ↓
healthy / unhealthy
```

---

# 24. Important Issue With Distroless Health Checks

Distroless images intentionally contain very few utilities.

Therefore commands such as:

```bash
curl
wget
sh
bash
```

may not exist inside the final container.

A health check such as:

```yaml
test: ["CMD", "curl", "http://localhost:3001"]
```

will therefore not work with a distroless runtime unless the required executable exists.

For a distroless Node.js container, a Node-based health-check script can be used if Node itself is available.

---

# 25. Environment Variables

Environment-specific configuration should not be hardcoded into Dockerfiles.

Examples:

```text
PORT
DATABASE_URL
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
```

These should be supplied through environment files or Compose environment configuration.

Recommended structure:

```text
project/
│
├── advanced_next_js/
│   ├── .env
│   ├── Dockerfile
│   └── ...
│
├── node_js/
│   ├── .env
│   ├── Dockerfile
│   └── ...
│
└── docker-compose.yml
```

Frontend and backend should have separate environment configuration.

For example:

```text
Next.js
   ↓
frontend environment


Express
   ↓
backend environment
   ↓
database configuration
```

Do not commit secrets to Git.

Use:

```text
.env
```

and add it to:

```text
.gitignore
```

---

# 26. Important Docker Environment Variable Concept

Inside Docker Compose, the database hostname is:

```text
postgres
```

not:

```text
localhost
```

Therefore backend configuration should use:

```text
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_CONTAINER_NAME}:5432/${POSTGRES_DB}
```

The hostname `postgres` comes from the Compose service name:

```yaml
postgres:
```

---

# 27. `pnpm prune --prod` Issue

An attempt was made to run:

```dockerfile
RUN corepack enable pnpm && pnpm prune --prod
```

after building the Next.js application.

The command removed development dependencies successfully, but then failed with:

```text
.prepare$ husky

.prepare: sh: husky: not found
```

Why?

The package has a `prepare` script that runs Husky:

```text
prepare → husky
```

When:

```bash
pnpm prune --prod
```

removes devDependencies, it removes:

```text
husky
```

But pnpm then runs the package lifecycle script:

```text
prepare
```

which tries to execute:

```text
husky
```

Since Husky was just removed:

```text
husky: not found
```

---

# 28. Why Husky Should Not Be Inside the Production Image

Husky is a development tool.

It is used for Git hooks such as:

```text
pre-commit
pre-push
```

Production containers do not need Git hooks.

Therefore the clean approach is to prevent Husky from running during production dependency installation/pruning.

For example, the `prepare` script can be made CI-aware.

A common pattern is:

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

and configure the environment so that Husky is skipped in CI/container builds.

Another approach is to avoid running `pnpm prune --prod` in the same stage where lifecycle scripts cause the development-only Husky dependency to be invoked.

---

# 29. Husky Checks

The project uses Husky to run checks before Git operations.

For example:

```text
git commit
    ↓
pre-commit
    ↓
pnpm lint
```

And:

```text
git push
    ↓
pre-push
    ↓
pnpm build
```

This prevents code from being committed or pushed when important checks fail.

---

# 30. Why Build Failed During Git Commit

The commit hook executed:

```text
eslint
next build
```

The build failed because Next.js attempted to download Google Fonts:

```text
https://fonts.googleapis.com/css2?family=Geist...
```

and could not establish the connection.

Error:

```text
Failed to fetch Geist from Google Fonts.
```

This is unrelated to Docker itself.

It happened because:

```text
next/font/google
       ↓
Next.js build
       ↓
Google Fonts request
       ↓
Network unavailable
       ↓
Build failed
```

A production-friendly solution is to self-host fonts using `next/font/local` if builds must work without external network access.

---

# 31. Docker Build Network Errors

During Docker dependency installation, errors such as:

```text
EAI_AGAIN
```

were encountered.

Example:

```text
GET https://registry.npmjs.org/... error (EAI_AGAIN)
```

This means DNS/network resolution temporarily failed.

There were also warnings such as:

```text
Tarball download average speed ... is below ...
```

These indicate slow network access to the npm registry.

This is generally a network/connectivity issue rather than a package issue.

Docker was eventually able to retry and download the packages.

---

# 32. PostgreSQL `ENOTFOUND postgres`

An important error was:

```text
getaddrinfo ENOTFOUND postgres
```

This means the Express container could not resolve the hostname:

```text
postgres
```

The usual causes are:

1. PostgreSQL container is not running.
2. Containers are not on the same Docker network.
3. Compose service name is incorrect.
4. Containers were started separately instead of through the same Compose network.

The solution was to put both services on the same network:

```yaml
networks:
  next_node:
```

and:

```yaml
node_js:
  networks:
    - next_node

postgres:
  networks:
    - next_node
```

Then:

```text
node_js → postgres:5432
```

works through Docker's internal DNS.

---

# 33. PostgreSQL Container Not Running

Another error occurred when trying:

```bash
docker exec -it "${POSTGRES_CONTAINER_NAME}" \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
```

Docker returned:

```text
container ... is not running
```

`docker exec` only works against a running container.

Check:

```bash
docker ps
```

For stopped containers:

```bash
docker ps -a
```

Then inspect the PostgreSQL logs:

```bash
docker logs postgres
```

The logs showed the PostgreSQL 18 volume layout issue.

---

# 34. How to Access PostgreSQL

If PostgreSQL is running:

```bash
docker exec -it "${POSTGRES_CONTAINER_NAME}" \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
```

This opens the PostgreSQL shell.

Useful commands:

```sql
\l
```

List databases.

```sql
\dt
```

List tables.

```sql
\c db_name
```

Connect to database.

```sql
\d
```

Show database relations.

```sql
\q
```

Exit PostgreSQL.

---

# 35. Where Docker Volumes Are Stored

Docker manages named volumes.

Check:

```bash
docker volume ls
```

Inspect a volume:

```bash
docker volume inspect postgres_data
```

Docker will show the host-side mount location.

Do not manually modify PostgreSQL's internal files unless you know exactly what you are doing.

Prefer interacting with PostgreSQL through:

```text
psql
SQL
application
database backup tools
```

---

# 36. Docker Compose Startup Flow

When running:

```bash
docker compose up --build
```

the general flow is:

```text
docker compose
      │
      ├── Build Next.js image
      │
      ├── Build Express image
      │
      ├── Pull PostgreSQL image
      │
      ├── Create network
      │
      ├── Create PostgreSQL container
      │
      ├── PostgreSQL health check
      │
      └── PostgreSQL healthy
                │
                ▼
           Start Express
                │
                ▼
           Start Next.js
```

---

# 37. Build vs Run

These are different operations.

## Build

```bash
docker compose build
```

Builds images.

It does not necessarily start containers.

---

## Start

```bash
docker compose up
```

Starts the services.

---

## Build + Start

```bash
docker compose up --build
```

This is commonly used during development after Dockerfile changes.

---

# 38. Running in Background

Instead of attaching to logs:

```bash
docker compose up -d
```

The `-d` means detached mode.

Then:

```bash
docker compose logs
```

or:

```bash
docker compose logs -f
```

can be used to view logs.

---

# 39. Viewing Individual Container Logs

Next.js:

```bash
docker logs next_js
```

Express:

```bash
docker logs node_js
```

PostgreSQL:

```bash
docker logs postgres
```

Follow logs:

```bash
docker logs -f node_js
```

---

# 40. Checking Container Status

```bash
docker ps
```

Shows running containers.

```bash
docker ps -a
```

Shows running and stopped containers.

For Compose:

```bash
docker compose ps
```

This also shows health status when health checks are configured.

---

# 41. Stopping the Application

```bash
docker compose down
```

This stops and removes the containers.

Named volumes are normally retained.

Therefore PostgreSQL data remains.

To also remove volumes:

```bash
docker compose down -v
```

Use this carefully.

---

# 42. Rebuilding From Scratch

If Docker cache or old containers are causing problems:

```bash
docker compose down
docker compose build --no-cache
docker compose up
```

For a completely fresh development database:

```bash
docker compose down -v
docker compose up --build
```

Again, `-v` removes database volumes.

---

# 43. Dockerfile vs Docker Compose

These two files have different responsibilities.

## Dockerfile

Defines:

```text
How to build the application image
```

For example:

```text
Node version
Dependencies
Build command
Production files
Runtime
```

## docker-compose.yml

Defines:

```text
How multiple containers run together
```

For example:

```text
Ports
Networks
Environment variables
Volumes
Health checks
Dependencies
Restart policies
Services
```

---

# 44. Current Architecture

The final architecture is approximately:

```text
                        HOST MACHINE
                            │
                            │
                    Docker Compose
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
      next_js            node_js           postgres
       :3000              :3001              :5432
          │                 │                 │
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                     next_node network
                            │
                            ▼
                     postgres_data
                         volume
```

Request flow:

```text
Browser
   │
   ▼
Next.js :3000
   │
   ▼
Express :3001
   │
   ▼
postgres:5432
   │
   ▼
PostgreSQL
```

---

# 45. Recommended Development Workflow

## Step 1 — Start Docker

```bash
docker compose up --build
```

Or detached:

```bash
docker compose up --build -d
```

---

## Step 2 — Check containers

```bash
docker compose ps
```

Expected services:

```text
next_js
node_js
postgres
```

---

## Step 3 — Check logs

```bash
docker compose logs -f
```

Or individual services:

```bash
docker logs -f node_js
```

```bash
docker logs -f postgres
```

---

## Step 4 — Check PostgreSQL

```bash
docker exec -it "${POSTGRES_CONTAINER_NAME}" \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
```

---

## Step 5 — Test backend

Open:

```text
http://localhost:3001
```

Expected response:

```text
Hello from express server
```

---

## Step 6 — Test frontend

Open:

```text
http://localhost:3000
```

---

# 46. Useful Docker Commands

## List images

```bash
docker images
```

## List containers

```bash
docker ps
```

## All containers

```bash
docker ps -a
```

## List volumes

```bash
docker volume ls
```

## Inspect volume

```bash
docker volume inspect postgres_data
```

## List networks

```bash
docker network ls
```

## Inspect network

```bash
docker network inspect next_node
```

## Execute command inside container

```bash
docker exec -it <container> <command>
```

Example:

```bash
docker exec -it "${POSTGRES_CONTAINER_NAME}" \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
```

## Container logs

```bash
docker logs <container>
```

## Follow logs

```bash
docker logs -f <container>
```

---

# 47. Important Rules

### Rule 1 — Containers should be disposable

Do not depend on container filesystem persistence.

For databases, use volumes.

---

### Rule 2 — Use service names for container communication

Inside Docker:

```text
postgres:5432
```

not:

```text
localhost:5432
```

---

### Rule 3 — Do not put secrets directly into Dockerfiles

Avoid:

```dockerfile
ENV DATABASE_PASSWORD=secret
```

Prefer environment configuration.

---

### Rule 4 — Keep build and runtime separate

Use multi-stage builds.

```text
builder
   ↓
production runner
```

---

### Rule 5 — Keep development dependencies out of production

Production does not need:

```text
TypeScript
ESLint
Husky
test tools
build tools
```

---

### Rule 6 — Be careful with `docker compose down -v`

This can remove database volumes.

```bash
docker compose down -v
```

should only be used when database data can be deleted or has been backed up.

---

# 48. Final Mental Model

The most important thing to understand is:

```text
Dockerfile
    ↓
Build Image
    ↓
Container


docker-compose.yml
    ↓
Connect Containers
    ↓
Network
    ↓
Volumes
    ↓
Environment Variables
    ↓
Health Checks
    ↓
Startup Order
```

For this project:

```text
             Docker Compose
                   │
       ┌───────────┼───────────┐
       │           │           │
       ▼           ▼           ▼
    Next.js     Express    PostgreSQL
       │___________│           │
                   └─────┬─────┘
                         │
       
                         │
                         ▼
                  postgres_data
                      volume
```

The key production concept is:

```text
Build once
   ↓
Create minimal runtime image
   ↓
Run containers
   ↓
Use Docker network for communication
   ↓
Use volumes for persistent data
   ↓
Use health checks for readiness
   ↓
Use environment variables for configuration
```

This gives the project a reproducible and production-oriented Docker setup.
