FROM node:22-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/payment-provider/package.json apps/payment-provider/package.json
COPY packages/test-data/package.json packages/test-data/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY apps/payment-provider apps/payment-provider
RUN npm run build --workspace @releaseguard/payment-provider
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /workspace

COPY --from=build --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/payment-provider/package.json ./apps/payment-provider/package.json
COPY --from=build --chown=node:node /workspace/apps/payment-provider/dist ./apps/payment-provider/dist

USER node
EXPOSE 4100
CMD ["node", "apps/payment-provider/dist/server.js"]
