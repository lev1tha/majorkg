# Деплой MAJOR KG на major.kg

Сервер уже занят другими проектами, поэтому схема выбрана так, чтобы их не
трогать: приложение живет в своих контейнерах, порты слушают только
`127.0.0.1`, а публичный трафик приводит **системный nginx** — тот же,
что обслуживает соседние сайты.

```
браузер ──► Cloudflare ──► nginx (хост, :443)
                             ├── /api/*  ──► 127.0.0.1:4100 ──► контейнер api  (Express + SQLite)
                             └── /*      ──► 127.0.0.1:3100 ──► контейнер web  (Next.js)
                                                   web ──► api по внутренней сети docker
```

`/api/*` отдается бэкенду напрямую, а не через `rewrites` Next.js: на один
сетевой хоп меньше, а cookie сессии все равно остается same-origin.

Файлы: [`Dockerfile`](../Dockerfile) ·
[`docker-compose.prod.yml`](../docker-compose.prod.yml) ·
[`nginx/major.kg.conf`](nginx/major.kg.conf) ·
[`cloudflare-realip.sh`](cloudflare-realip.sh) · [`deploy.sh`](deploy.sh)

---

## Шаг 0. Забрать код на сервер

Файлы деплоя лежат в репозитории, так что на сервере достаточно обновиться:

```bash
cd /root/projects/majorkg && git pull --ff-only
```

## Шаг 1. Осмотреться на сервере

```bash
echo "── порты ──"; ss -ltnp | grep -E ':(80|443|3100|4100)\b' || echo "3100/4100 свободны"
echo "── контейнеры ──"; docker ps --format '{{.Names}}\t{{.Ports}}'
echo "── сайты nginx ──"; ls -l /etc/nginx/sites-enabled/; nginx -v
echo "── сертификаты ──"; ls /etc/letsencrypt/live/ 2>/dev/null || echo "letsencrypt не настроен"
echo "── certbot ──"; command -v certbot || echo "certbot не установлен"
echo "── ресурсы ──"; free -h; df -h /
```

Если `3100` или `4100` заняты — поменять `WEB_PORT`/`API_PORT` в `.env` и
`upstream` в `nginx/major.kg.conf`.

Сборка Next.js забирает примерно 1–1.5 ГБ RAM. На 4 ГБ с соседними
контейнерами это впритык — если своп отсутствует (`free -h` показывает
`Swap: 0B`), добавить его до сборки:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## Шаг 2. Переменные окружения

Оба файла в git не попадают.

**`.env`** рядом с `docker-compose.prod.yml` — порты и то, что инлайнится
в браузерный бандл на сборке:

```bash
cd /root/projects/majorkg
cp .env.example .env
nano .env          # NEXT_PUBLIC_DISCORD_URL и прочее
```

**`backend/.env`** — секреты, в образ они не попадают:

```bash
cat > backend/.env <<'EOF'
NODE_ENV=production
PORT=4000

SITE_URL=https://major.kg
API_URL=https://major.kg
CORS_ORIGINS=https://major.kg

DATABASE_URL=./data/majorkg.db

SESSION_SECRET=ВСТАВИТЬ_СЮДА
SESSION_TTL_DAYS=30
ADMIN_SESSION_TTL_HOURS=12

ADMIN_LOGIN=admin
ADMIN_PASSWORD=

STEAM_API_KEY=
FACEIT_API_KEY=
EOF
chmod 600 backend/.env
```

`SESSION_SECRET` сгенерировать и вписать самому — при пустом значении
бэкенд не стартует в production:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`API_URL=https://major.kg` (а не адрес контейнера) — от него строится
`openid.return_to` для входа через Steam, туда Valve возвращает игрока.

`ADMIN_PASSWORD` — минимум 8 символов, задать свой. `STEAM_API_KEY`
([получить](https://steamcommunity.com/dev/apikey)) нужен только для ника
и аватара: сам вход работает и без него. `FACEIT_API_KEY` включает живое
ELO — если он пустой, оставить `NEXT_PUBLIC_FACEIT_LIVE=false` в `.env`.

## Шаг 3. Сборка и запуск

```bash
cd /root/projects/majorkg
mkdir -p backend/data
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
curl -s http://127.0.0.1:4100/api/health
curl -sI http://127.0.0.1:3100/ | head -1
```

Первая сборка — 5–10 минут: ставятся зависимости и собирается Next.

`NEXT_PUBLIC_*` попадают в браузерный бандл на этапе сборки, поэтому после
правки `.env` мало перезапустить контейнеры — нужен `--build`. Секреты из
`backend/.env` читаются в рантайме, там хватает
`docker compose -f docker-compose.prod.yml up -d`.

В логах сборки Next будет несколько `ECONNREFUSED` — это server components
пытаются сходить в API, которого на этапе сборки еще нет. Все страницы,
кроме `/robots.txt` и `/icon.svg`, серверные (`ƒ`), так что на результат
это не влияет.

## Шаг 4. Первый админ

Сайту нужен аккаунт организатора — Steam в админке не участвует.

**Чистый прод, без демо-данных:**

```bash
docker compose -f docker-compose.prod.yml run --rm api node --input-type=module -e "
import { migrate } from './dist/db/index.js'
import { createAdmin, countAdmins } from './dist/services/admins.js'
migrate()
if (countAdmins() > 0) { console.log('админ уже есть'); process.exit(0) }
const a = await createAdmin({ login: process.env.ADMIN_LOGIN, password: process.env.ADMIN_PASSWORD, name: 'Главный организатор' })
console.log('создан админ:', a.login)
"
```

**Витрина с демо-турнирами и игроками** (`npm run seed` заводит и админа,
и демо-контент — на боевом домене он потом виден всем):

```bash
docker compose -f docker-compose.prod.yml run --rm api npm run seed
```

Вход — `https://major.kg/admin`, отдельной страницы `/admin/login` нет.

## Шаг 5. nginx и TLS

```bash
cp deploy/nginx/major.kg.conf /etc/nginx/sites-available/major.kg
ln -s /etc/nginx/sites-available/major.kg /etc/nginx/sites-enabled/major.kg

# Настоящий IP игрока вместо адреса Cloudflare
bash deploy/cloudflare-realip.sh
```

У `www.major.kg` сейчас нет DNS-записи — только у апекса `major.kg`.
Либо завести в Cloudflare CNAME `www` → `major.kg` (оранжевая тучка),
либо убрать из конфига второй `server`-блок с `server_name www.major.kg`
и не указывать `-d www.major.kg` при выпуске сертификата: certbot не
подтвердит домен, который не резолвится, и упадет весь выпуск.

Сертификат. Домен проксируется через Cloudflare, поэтому есть два пути:

**a) Let's Encrypt** — как у соседних сайтов, если certbot уже стоит.
Проверка идет по HTTP, поэтому на время выпуска в Cloudflare нужно
выключить «Always Use HTTPS» либо серую тучку:

```bash
certbot --nginx -d major.kg -d www.major.kg
```

**b) Cloudflare Origin Certificate** — проще за прокси и живет 15 лет.
В панели CF: SSL/TLS → Origin Server → Create Certificate, положить на
сервер и поправить пути в конфиге:

```bash
mkdir -p /etc/ssl/major.kg && chmod 700 /etc/ssl/major.kg
# вставить cert.pem и key.pem, затем в major.kg.conf заменить пути
# ssl_certificate / ssl_certificate_key и убрать include options-ssl-nginx.conf
```

Применить:

```bash
nginx -t && systemctl reload nginx
```

`nginx -t` обязателен: он проверит и соседние сайты — если конфиг не
пройдет, `reload` не выполнится и работающие проекты не упадут.

## Шаг 6. Cloudflare

- SSL/TLS → **Full (strict)** (при Flexible получится редирект-петля:
  nginx уводит на https, CF ходит по http).
- Оранжевая тучка на `major.kg` и `www`.
- Если включен Rocket Loader или агрессивный Auto Minify — выключить,
  Next.js они ломают.

## Обновления

```bash
cd /root/projects/majorkg && bash deploy/deploy.sh
```

Скрипт снимает бэкап базы в `backups/` (хранит 14 последних), делает
`git pull --ff-only`, пересобирает образ, перезапускает контейнеры и ждет
`/api/health`.

## Если что-то не так

```bash
docker compose -f docker-compose.prod.yml logs -f --tail 100 api
docker compose -f docker-compose.prod.yml logs -f --tail 100 web
tail -f /var/log/nginx/major.kg.error.log
```

| Симптом | Куда смотреть |
| --- | --- |
| 502 от nginx | Контейнер не поднялся: `docker compose ... ps`, порт в `upstream` совпадает с `WEB_PORT`/`API_PORT` |
| `Переменная окружения SESSION_SECRET обязательна` | Пустой `SESSION_SECRET` в `backend/.env` |
| Вход через Steam возвращает на localhost | `SITE_URL`/`API_URL` в `backend/.env` не поменяли на `https://major.kg` |
| Слетает сессия | Cookie ставится с `secure` — сайт должен открываться по https |
| Всех лимитит 429 разом | Не подключен `cloudflare-realip.conf`, и все игроки считаются одним IP |
| Сборка падает по памяти | Нет свопа, см. шаг 1 |

## Бэкап и восстановление

База — один файл `backend/data/majorkg.db`. Копию снимает `deploy.sh`,
разово — той же командой:

```bash
docker compose -f docker-compose.prod.yml exec -T api node --input-type=module -e "
import Database from 'better-sqlite3'
const db = new Database('./data/majorkg.db', { readonly: true })
await db.backup('./data/backup-tmp.db')
db.close()
" && mv backend/data/backup-tmp.db backups/manual-$(date +%F).db
```

Восстановление — остановить `api`, положить файл на место `majorkg.db`
(удалив `-wal` и `-shm` рядом) и поднять обратно.
