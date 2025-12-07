FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Create database with schema during build time (for template)
ENV DATABASE_URL="file:./db/custom.db"
RUN mkdir -p db && npx prisma db push --skip-generate

# Declare build arguments
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_PERFEX_URL
ARG PERFEX_API_URL
ARG PERFEX_API_KEY
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ARG DATABASE_URL

# Make them available during build
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_PERFEX_URL=$NEXT_PUBLIC_PERFEX_URL
ENV PERFEX_API_URL=$PERFEX_API_URL
ENV PERFEX_API_KEY=$PERFEX_API_KEY
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV DATABASE_URL=$DATABASE_URL

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy prisma schema for runtime needs
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Copy db folder for SQLite initialization (as fallback/template)
COPY --from=builder --chown=nextjs:nodejs /app/db ./db-template
# Copy Prisma engine binaries (CRITICAL for standalone mode!)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client
# Copy prisma CLI for runtime db initialization
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/engines ./node_modules/@prisma/engines

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Use entrypoint script to initialize db if needed
CMD ["./docker-entrypoint.sh"]

