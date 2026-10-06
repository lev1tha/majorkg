#!/usr/bin/env bash
#
# Запуск одного инстанса CS2-сервера.
#
#   run.sh <номер>
#
# Номер задает смещение портов, чтобы несколько серверов жили на одной
# машине без правки конфигов:
#   1 → 27015 игра и RCON, 27020 SourceTV
#   2 → 27016,             27021
#
# Вызывается из systemd (cs2@.service), но работает и руками — этим удобно
# ловить ошибки старта до того, как заводить юнит.

set -euo pipefail

INSTANCE="${1:?Укажите номер инстанса: run.sh 1}"
INSTALL_DIR="${INSTALL_DIR:-/home/steam/cs2}"

PORT=$(( 27014 + INSTANCE ))
TV_PORT=$(( 27019 + INSTANCE ))

# У каждого сервера свой GSLT: Valve не разрешает делить токен между
# инстансами, второй с тем же токеном молча не пустит игроков.
TOKEN_VAR="GSLT_${INSTANCE}"
TOKEN="${!TOKEN_VAR:-}"

if [ -z "$TOKEN" ]; then
  echo "Не задан ${TOKEN_VAR} в /etc/default/cs2 — без токена сервер не пустит игроков из интернета." >&2
  exit 1
fi

exec "${INSTALL_DIR}/game/bin/linuxsteamrt64/cs2" \
  -dedicated \
  -console \
  -usercon \
  -port "$PORT" \
  +tv_port "$TV_PORT" \
  +sv_setsteamaccount "$TOKEN" \
  +game_type 0 \
  +game_mode 1 \
  +mapgroup mg_active \
  +map de_dust2
