FROM node:24-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

FROM base AS builder
ENV CI=true
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build
RUN corepack enable pnpm && pnpm prune --prod --ignore-scripts

FROM gcr.io/distroless/nodejs24-debian13 AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["server.js"]