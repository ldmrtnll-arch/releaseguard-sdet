FROM node:22-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/test-data/package.json packages/test-data/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY apps/web apps/web
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace @releaseguard/web

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
