#!/usr/bin/env bash
# Выкатка новой версии MAJOR KG. Запускать из корня проекта на сервере:
#   bash deploy/deploy.sh
#
# Простой rebuild + перезапуск. Даунтайм — секунды на подъем контейнеров;
# nginx в это время отдает 502, поэтому выкатывать лучше не в прайм-тайм.

set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> Бэкап базы"
mkdir -p backups
STAMP=$(date +%F-%H%M)
if [ -f backend/data/majorkg.db ]; then
  # .backup() снимает согласованную копию под нагрузкой — в отличие от cp,
  # который при journal_mode=WAL может застать базу между записями.
  $COMPOSE exec -T api node --input-type=module -e "
import Database from 'better-sqlite3'
const db = new Database('./data/majorkg.db', { readonly: true })
await db.backup('./data/backup-tmp.db')
db.close()
"
  mv backend/data/backup-tmp.db "backups/majorkg-$STAMP.db"
  # Держим последние 14 копий.
  ls -1t backups/*.db | tail -n +15 | xargs -r rm --
  echo "    -> backups/majorkg-$STAMP.db"
else
  echo "    базы еще нет, пропускаем"
fi

echo "==> Подтягиваем код"
git pull --ff-only

echo "==> Сборка образа"
$COMPOSE build

echo "==> Перезапуск"
$COMPOSE up -d

echo "==> Ждем health"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:"${API_PORT:-4100}"/api/health >/dev/null 2>&1; then
    echo "    api жив"
    break
  fi
  sleep 2
  [ "$i" = 30 ] && { echo "    api не поднялся, смотри: $COMPOSE logs api"; exit 1; }
done

echo "==> Чистим старые образы"
docker image prune -f >/dev/null

$COMPOSE ps
echo "Готово: https://major.kg"
