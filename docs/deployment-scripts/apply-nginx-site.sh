#!/usr/bin/env bash
set -euo pipefail

SITE_NAME="${SPELLBOOK_NGINX_SITE_NAME:-spellbook}"
SITE_AVAILABLE="/etc/nginx/sites-available/$SITE_NAME"
SITE_ENABLED="/etc/nginx/sites-enabled/$SITE_NAME"
NGINX_MODE="${SPELLBOOK_NGINX_MODE:-api-only}"
SERVER_NAME="${SPELLBOOK_SERVER_NAME:-api.d20spellcodex.com}"
FRONTEND_ROOT="${SPELLBOOK_FRONTEND_ROOT:-/var/www/spellbook}"
API_UPSTREAM="${SPELLBOOK_API_UPSTREAM:-http://127.0.0.1:3000}"
ENABLE_SSL="${SPELLBOOK_NGINX_ENABLE_SSL:-false}"
SSL_CERTIFICATE="${SPELLBOOK_NGINX_SSL_CERTIFICATE:-}"
SSL_CERTIFICATE_KEY="${SPELLBOOK_NGINX_SSL_CERTIFICATE_KEY:-}"

echo "==> Apply Nginx site config: $SITE_NAME ($NGINX_MODE)"

tmp="$(mktemp)"

write_listen_directive() {
  if [ "$ENABLE_SSL" = "true" ]; then
    if [ -z "$SSL_CERTIFICATE" ] || [ -z "$SSL_CERTIFICATE_KEY" ]; then
      echo "SPELLBOOK_NGINX_ENABLE_SSL=true requires SPELLBOOK_NGINX_SSL_CERTIFICATE and SPELLBOOK_NGINX_SSL_CERTIFICATE_KEY" >&2
      exit 1
    fi

    cat <<EOF
  listen 443 ssl;
  ssl_certificate $SSL_CERTIFICATE;
  ssl_certificate_key $SSL_CERTIFICATE_KEY;
EOF
  else
    cat <<EOF
  listen 80;
EOF
  fi
}

write_api_proxy_locations() {
  cat <<EOF
  location /api/ {
    proxy_pass $API_UPSTREAM;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  location = /health {
    proxy_pass $API_UPSTREAM;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
EOF
}

case "$NGINX_MODE" in
  api-only)
    {
      cat <<EOF
server {
EOF
      write_listen_directive
      cat <<EOF
  server_name $SERVER_NAME;

  add_header X-Content-Type-Options nosniff always;
  add_header X-Frame-Options SAMEORIGIN always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
EOF
      write_api_proxy_locations
      cat <<EOF

  location / {
    return 404;
  }
}
EOF
    } > "$tmp"
    ;;
  single-origin)
    {
      cat <<EOF
server {
EOF
      write_listen_directive
      cat <<EOF
  server_name $SERVER_NAME;

  root $FRONTEND_ROOT;
  index index.html;

  add_header X-Content-Type-Options nosniff always;
  add_header X-Frame-Options SAMEORIGIN always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;

  location /locales/ {
    add_header Cache-Control "no-cache" always;
    try_files \$uri =404;
  }

  location / {
    try_files \$uri \$uri/ /index.html;
  }

EOF
      write_api_proxy_locations
      cat <<EOF

  location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$ {
    expires 7d;
    add_header Cache-Control "public, max-age=604800, immutable" always;
    try_files \$uri =404;
  }
}
EOF
    } > "$tmp"
    ;;
  *)
    echo "Invalid SPELLBOOK_NGINX_MODE: $NGINX_MODE" >&2
    echo "Expected: api-only or single-origin" >&2
    exit 1
    ;;
esac

if sudo test -f "$SITE_AVAILABLE"; then
  backup="${SITE_AVAILABLE}.bak.$(date -u +%Y%m%dT%H%M%SZ)"
  echo "==> Backup existing config -> $backup"
  sudo cp -a "$SITE_AVAILABLE" "$backup"
fi

sudo install -m 644 -o root -g root "$tmp" "$SITE_AVAILABLE"
rm -f "$tmp"

if ! sudo test -e "$SITE_ENABLED"; then
  sudo ln -s "$SITE_AVAILABLE" "$SITE_ENABLED"
fi

if sudo test -e /etc/nginx/sites-enabled/default; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi

echo "==> Test Nginx config"
sudo nginx -t

echo "==> Reload Nginx"
sudo systemctl reload nginx

echo "==> Nginx site config applied"
