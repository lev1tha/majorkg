#!/usr/bin/env bash
# Собирает /etc/nginx/snippets/cloudflare-realip.conf из актуальных
# диапазонов Cloudflare. Домен major.kg проксируется через CF, поэтому
# без этого nginx и backend видят адрес CF вместо адреса игрока.
#
# Запуск: sudo bash deploy/cloudflare-realip.sh && sudo nginx -t && sudo systemctl reload nginx
# Диапазоны меняются редко — достаточно перезапускать раз в несколько месяцев.

set -euo pipefail

OUT=/etc/nginx/snippets/cloudflare-realip.conf
TMP=$(mktemp)

{
  echo "# Сгенерировано deploy/cloudflare-realip.sh — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# Источник: https://www.cloudflare.com/ips-v4 и /ips-v6"
  for url in https://www.cloudflare.com/ips-v4 https://www.cloudflare.com/ips-v6; do
    curl -fsS --max-time 15 "$url" | while read -r cidr; do
      [ -n "$cidr" ] && echo "set_real_ip_from $cidr;"
    done
  done
  echo "real_ip_header CF-Connecting-IP;"
} > "$TMP"

# Хотя бы десяток диапазонов + заголовок — иначе curl отдал мусор.
if [ "$(grep -c set_real_ip_from "$TMP")" -lt 10 ]; then
  echo "Списки Cloudflare выглядят пустыми — конфиг не тронут" >&2
  rm -f "$TMP"
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
install -m 0644 "$TMP" "$OUT"
rm -f "$TMP"
echo "Готово: $OUT ($(grep -c set_real_ip_from "$OUT") диапазонов)"
