# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client before building
RUN npx prisma generate

# Build the Next.js app (outputs .next/standalone)
RUN npm run build

# ── Stage 3: production runner ────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# The runtime starts Node directly and runs Prisma through its copied CLI.
# npm/npx are build-time tooling and their bundled dependency tree needlessly
# expands the production attack surface, so keep them out of the final image.
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/bin/npm \
    /usr/local/bin/npx

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma needs the schema at runtime for migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Keep the Prisma CLI in the image so the GitOps migration hook can apply
# committed migrations with the same immutable image as the application.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
# Prisma's CLI is a devDependency used by the migration hook. The standalone
# Next.js trace does not include its transitive CLI packages, so copy that
# small dependency closure explicitly instead of copying all build tooling.
COPY --from=builder /app/node_modules/c12 ./node_modules/c12
COPY --from=builder /app/node_modules/citty ./node_modules/citty
COPY --from=builder /app/node_modules/chokidar ./node_modules/chokidar
COPY --from=builder /app/node_modules/confbox ./node_modules/confbox
COPY --from=builder /app/node_modules/consola ./node_modules/consola
COPY --from=builder /app/node_modules/deepmerge-ts ./node_modules/deepmerge-ts
COPY --from=builder /app/node_modules/defu ./node_modules/defu
COPY --from=builder /app/node_modules/destr ./node_modules/destr
COPY --from=builder /app/node_modules/effect ./node_modules/effect
COPY --from=builder /app/node_modules/empathic ./node_modules/empathic
COPY --from=builder /app/node_modules/exsolve ./node_modules/exsolve
COPY --from=builder /app/node_modules/fast-check ./node_modules/fast-check
COPY --from=builder /app/node_modules/giget ./node_modules/giget
COPY --from=builder /app/node_modules/jiti ./node_modules/jiti
COPY --from=builder /app/node_modules/node-fetch-native ./node_modules/node-fetch-native
COPY --from=builder /app/node_modules/nypm ./node_modules/nypm
COPY --from=builder /app/node_modules/ohash ./node_modules/ohash
COPY --from=builder /app/node_modules/pathe ./node_modules/pathe
COPY --from=builder /app/node_modules/perfect-debounce ./node_modules/perfect-debounce
COPY --from=builder /app/node_modules/pkg-types ./node_modules/pkg-types
COPY --from=builder /app/node_modules/pure-rand ./node_modules/pure-rand
COPY --from=builder /app/node_modules/rc9 ./node_modules/rc9
COPY --from=builder /app/node_modules/readdirp ./node_modules/readdirp
COPY --from=builder /app/node_modules/tinyexec ./node_modules/tinyexec

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
