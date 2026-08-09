FROM node:20-bookworm-slim AS build

WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . ./
RUN npm run build

FROM alpine:3.24 AS darkhttpd
RUN apk add --no-cache build-base git \
    && git clone --depth 1 --branch v1.17 https://github.com/emikulic/darkhttpd.git /src \
    && make -C /src CC=gcc CFLAGS="-Os" LDFLAGS="-static -s"

FROM scratch
COPY --from=darkhttpd /src/darkhttpd /darkhttpd
COPY --from=build /src/dist/ /AriaNg/
EXPOSE 6880
ENTRYPOINT ["/darkhttpd", "/AriaNg"]
CMD ["--port", "6880"]
