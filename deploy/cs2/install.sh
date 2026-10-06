#!/usr/bin/env bash
#
# Установка CS2-сервера на чистую Debian/Ubuntu машину.
#
# Запускать от root:  bash deploy/cs2/install.sh
#
# Скрипт идемпотентен: повторный запуск обновляет игру и не ломает уже
# заведенные инстансы.

set -euo pipefail

STEAM_USER="${STEAM_USER:-steam}"
INSTALL_DIR="${INSTALL_DIR:-/home/${STEAM_USER}/cs2}"

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Нужны права root: sudo bash $0" >&2
  exit 1
fi

say "Пакеты"
# lib32gcc нужен самому steamcmd: он 32-битный даже на 64-битной системе.
dpkg --add-architecture i386
apt-get update -qq
apt-get install -y --no-install-recommends \
  ca-certificates curl tar gzip \
  lib32gcc-s1 lib32stdc++6 libsdl2-2.0-0:i386 \
  ufw

say "Пользователь ${STEAM_USER}"
# Сервер не должен ходить от root: эксплойт в движке не должен давать машину.
if ! id -u "$STEAM_USER" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "$STEAM_USER"
fi

say "SteamCMD"
sudo -u "$STEAM_USER" bash <<'INNER'
set -euo pipefail
mkdir -p ~/steamcmd
cd ~/steamcmd
if [ ! -x ./steamcmd.sh ]; then
  curl -sSL https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz | tar zxf -
fi
INNER

say "Counter-Strike 2 (app 730) — это десятки гигабайт, будет долго"
sudo -u "$STEAM_USER" bash -lc "
  ~/steamcmd/steamcmd.sh \
    +force_install_dir '${INSTALL_DIR}' \
    +login anonymous \
    +app_update 730 validate \
    +quit
"

say "Каталог конфигов и обертка запуска"
sudo -u "$STEAM_USER" mkdir -p "${INSTALL_DIR}/game/csgo/cfg"
install -o "$STEAM_USER" -g "$STEAM_USER" -m 755 \
  "$(dirname "$0")/run.sh" "${INSTALL_DIR}/run.sh"

say "Файрвол"
# 27015 — игра и RCON, 27020 — SourceTV. Диапазон под несколько инстансов.
ufw allow 27015:27035/udp >/dev/null
ufw allow 27015:27035/tcp >/dev/null

cat <<EOF

Готово. Установлено в ${INSTALL_DIR}

Дальше:
  1. Получить GSLT: https://steamcommunity.com/dev/managegameservers  (appid 730)
  2. cp deploy/cs2/server.cfg.example ${INSTALL_DIR}/game/csgo/cfg/server.cfg
     и вписать туда свой rcon_password
  3. cp deploy/cs2/cs2@.service /etc/systemd/system/
     cp deploy/cs2/cs2.env /etc/default/cs2   и вписать GSLT
     systemctl daemon-reload
     systemctl enable --now cs2@1
  4. Добавить сервер в админку MAJOR KG: /admin/servers

EOF
