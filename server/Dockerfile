# Builds on Debian slim because bcrypt and the Prisma engine ship glibc binaries.
FROM node:20-slim AS build
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Keeps the generated Prisma client, and removes the compiler and CLI from the final image.
FROM build AS prune
RUN npm prune --omit=dev --ignore-scripts

FROM node:20-slim AS runner
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prune --chown=node:node /app/node_modules ./node_modules
COPY --from=prune --chown=node:node /app/dist ./dist
COPY --from=prune --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 5000
CMD ["node", "dist/cluster.js"]
