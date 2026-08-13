FROM node:24-alpine AS base

RUN npm install -g pnpm@11.21.0

FROM base AS deps
WORKDIR /server
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
ENV CI=true
WORKDIR /server
COPY --from=deps /server/node_modules ./node_modules
COPY . .
RUN pnpm build
RUN pnpm prune --prod

FROM gcr.io/distroless/nodejs24-debian13 AS runner
WORKDIR /server
COPY --from=builder /server/dist ./
COPY --from=builder /server/public ./public
COPY --from=builder /server/node_modules ./node_modules
COPY --from=builder /server/package.json ./package.json

EXPOSE 3001

CMD ["server.js"]