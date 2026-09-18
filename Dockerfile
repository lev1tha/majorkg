# syntax=docker/dockerfile:1

# Один образ на оба процесса: api и web запускаются из него разными
# командами (см. docker-compose.prod.yml). Так сборка идет один раз,
# а node_modules не дублируются между двумя образами.

FROM node:22-bookworm-slim AS build
WORKDIR /app

# better-sqlite3 собирается из исходников, если для платформы нет prebuild.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Сначала манифесты — слой с зависимостями переиспользуется между сборками.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

# package-lock.json собран на macOS arm64, и платформенные пакеты записаны
# в нем только как darwin-arm64: @typescript/typescript-*, @next/swc-*,
# @tailwindcss/oxide-*, lightningcss-*, @esbuild/*, @img/sharp-*. Все они
# объявлены как optionalDependencies, а npm — и ci, и install — собирает
# дерево строго по локу и linux-варианты в него не добавляет. Итог: tsc
# падает с "Unable to resolve @typescript/typescript-linux-x64".
# Поэтому в образе резолвим заново от package.json. Диапазоны там — ^,
# то есть мажоры зафиксированы, но патчи могут разъехаться с локальными.
#
# Побочный результат — корректный для linux лок, его можно забрать из
# образа и закоммитить, чтобы вернуться к воспроизводимому npm ci:
#   docker compose -f docker-compose.prod.yml run --rm --entrypoint cat \
#     api /app/package-lock.linux.json > package-lock.json
RUN rm -f package-lock.json \
 && npm install --no-audit --no-fund \
 && cp package-lock.json /app/package-lock.linux.json

# NEXT_PUBLIC_* инлайнятся в бандл на этапе сборки, поэтому приходят
# аргументами. API_INTERNAL_URL нужен и на сборке (rewrites в
# next.config.mjs), и в рантайме (server components).
ARG API_INTERNAL_URL=http://api:4000
ARG NEXT_PUBLIC_SITE_URL=https://major.kg
ARG NEXT_PUBLIC_FACEIT_LIVE=false
ARG NEXT_PUBLIC_DISCORD_URL=
ARG NEXT_PUBLIC_TELEGRAM_URL=
ARG NEXT_PUBLIC_GOOGLE_VERIFICATION=
ARG NEXT_PUBLIC_YANDEX_VERIFICATION=

ENV API_INTERNAL_URL=$API_INTERNAL_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_FACEIT_LIVE=$NEXT_PUBLIC_FACEIT_LIVE \
    NEXT_PUBLIC_DISCORD_URL=$NEXT_PUBLIC_DISCORD_URL \
    NEXT_PUBLIC_TELEGRAM_URL=$NEXT_PUBLIC_TELEGRAM_URL \
    NEXT_PUBLIC_GOOGLE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_VERIFICATION \
    NEXT_PUBLIC_YANDEX_VERIFICATION=$NEXT_PUBLIC_YANDEX_VERIFICATION \
    NEXT_TELEMETRY_DISABLED=1

COPY . .

# tsc для бэкенда + next build для фронтенда.
RUN npm run build

# Финальный образ — без apt-компиляторов, только готовое дерево.
# devDependencies остаются: tsx нужен для `npm run seed` в контейнере.
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
# npm раскладывает бинарники то в корневой node_modules, то в воркспейсный —
# зависит от того, есть ли конфликты версий. PATH снимает этот вопрос:
# команды в compose зовут next и tsx по имени, а не по пути.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PATH=/app/node_modules/.bin:/app/frontend/node_modules/.bin:/app/backend/node_modules/.bin:$PATH
COPY --from=build /app /app
