#!/bin/bash
set -Eeuo pipefail

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx reload failed: nginx is unavailable." >&2
  exit 1
fi

nginx -t
systemctl reload nginx

echo "nginx configuration validated and reloaded."
