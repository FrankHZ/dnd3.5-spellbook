#!/usr/bin/env bash
set -euo pipefail

SITE_NAME="${SPELLBOOK_NGINX_SITE_NAME:-spellbook}"
SITES_AVAILABLE_DIR="${SPELLBOOK_NGINX_SITES_AVAILABLE_DIR:-/etc/nginx/sites-available}"
SITES_ENABLED_DIR="${SPELLBOOK_NGINX_SITES_ENABLED_DIR:-/etc/nginx/sites-enabled}"
SITE_AVAILABLE="$SITES_AVAILABLE_DIR/$SITE_NAME"
SITE_ENABLED="$SITES_ENABLED_DIR/$SITE_NAME"
DEFAULT_SITE="$SITES_ENABLED_DIR/default"
NGINX_MODE="${SPELLBOOK_NGINX_MODE:-api-only}"
SERVER_NAME="${SPELLBOOK_SERVER_NAME:-api.d20spellcodex.com}"
FRONTEND_ROOT="${SPELLBOOK_FRONTEND_ROOT:-/var/www/spellbook}"
API_UPSTREAM="${SPELLBOOK_API_UPSTREAM:-http://127.0.0.1:3000}"
ENABLE_SSL="${SPELLBOOK_NGINX_ENABLE_SSL:-false}"
SSL_CERTIFICATE="${SPELLBOOK_NGINX_SSL_CERTIFICATE:-}"
SSL_CERTIFICATE_KEY="${SPELLBOOK_NGINX_SSL_CERTIFICATE_KEY:-}"
ACME_CHALLENGE_ROOT="${SPELLBOOK_ACME_CHALLENGE_ROOT:-/var/www/certbot}"

echo "==> Apply Nginx site config: $SITE_NAME ($NGINX_MODE)"

tmp="$(mktemp)"
backup=""
default_backup=""
had_site="false"
enabled_created="false"
default_removed="false"
rollback_required="false"

restore_previous_config() {
  local status=0

  echo "==> Restore prior Nginx configuration" >&2
  if [ "$had_site" = "true" ]; then
    sudo cp -a "$backup" "$SITE_AVAILABLE" || status=1
  else
    sudo rm -f "$SITE_AVAILABLE" || status=1
  fi

  if [ "$enabled_created" = "true" ]; then
    sudo rm -f "$SITE_ENABLED" || status=1
  fi

  if [ "$default_removed" = "true" ]; then
    sudo cp -a "$default_backup" "$DEFAULT_SITE" || status=1
  fi

  if sudo nginx -t; then
    sudo systemctl reload nginx || status=1
  else
    status=1
  fi

  return "$status"
}

finish() {
  local exit_status="$1"
  trap - EXIT
  set +e

  if [ "$exit_status" -ne 0 ] && [ "$rollback_required" = "true" ]; then
    if ! restore_previous_config; then
      echo "Prior Nginx files were restored incompletely; inspect Nginx before another reload" >&2
    fi
  fi

  rm -f "$tmp"
  if [ -n "$default_backup" ]; then
    sudo rm -f "$default_backup" 2>/dev/null || true
  fi
  exit "$exit_status"
}

trap 'finish $?' EXIT

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

write_ssl_directives() {
  if [ -z "$SSL_CERTIFICATE" ] || [ -z "$SSL_CERTIFICATE_KEY" ]; then
    echo "SPELLBOOK_NGINX_ENABLE_SSL=true requires SPELLBOOK_NGINX_SSL_CERTIFICATE and SPELLBOOK_NGINX_SSL_CERTIFICATE_KEY" >&2
    exit 1
  fi

  cat <<EOF
  listen 443 ssl;
  ssl_certificate $SSL_CERTIFICATE;
  ssl_certificate_key $SSL_CERTIFICATE_KEY;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 10m;
  ssl_protocols TLSv1.2 TLSv1.3;
EOF
}

write_common_headers() {
  cat <<EOF
  add_header X-Content-Type-Options nosniff always;
  add_header X-Frame-Options SAMEORIGIN always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
EOF
}

write_acme_challenge_location() {
  cat <<EOF
  location ^~ /.well-known/acme-challenge/ {
    root $ACME_CHALLENGE_ROOT;
    default_type text/plain;
    try_files \$uri =404;
  }
EOF
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
      if [ "$ENABLE_SSL" = "true" ]; then
        cat <<EOF
server {
  listen 80;
  server_name $SERVER_NAME;

EOF
        write_common_headers
        cat <<EOF

EOF
        write_acme_challenge_location
        cat <<EOF

  location / {
    return 301 https://\$host\$request_uri;
  }
}

server {
EOF
        write_ssl_directives
      else
        cat <<EOF
server {
EOF
        write_listen_directive
      fi
      cat <<EOF
  server_name $SERVER_NAME;

EOF
      write_common_headers
      cat <<EOF
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
  backup="${SITE_AVAILABLE}.bak.$(date -u +%Y%m%dT%H%M%SZ).$$"
  echo "==> Backup existing config -> $backup"
  sudo cp -a "$SITE_AVAILABLE" "$backup"
  had_site="true"
fi

rollback_required="true"
sudo install -m 644 -o root -g root "$tmp" "$SITE_AVAILABLE"

if ! sudo test -e "$SITE_ENABLED" && ! sudo test -L "$SITE_ENABLED"; then
  sudo ln -s "$SITE_AVAILABLE" "$SITE_ENABLED"
  enabled_created="true"
fi

echo "==> Test Nginx config"
sudo nginx -t

if sudo test -e "$DEFAULT_SITE" || sudo test -L "$DEFAULT_SITE"; then
  default_backup="${DEFAULT_SITE}.spellbook-backup.$(date -u +%Y%m%dT%H%M%SZ).$$"
  sudo cp -a "$DEFAULT_SITE" "$default_backup"
  sudo rm -f "$DEFAULT_SITE"
  default_removed="true"
fi

echo "==> Reload Nginx"
sudo systemctl reload nginx

rollback_required="false"
echo "==> Nginx site config applied"
