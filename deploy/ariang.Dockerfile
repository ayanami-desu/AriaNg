FROM node:20-bookworm-slim AS build

WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /src/dist/ /usr/share/nginx/html/
COPY deploy/ariang-nginx.conf /etc/nginx/conf.d/default.conf
