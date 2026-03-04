#!/usr/bin/env bash
set -e

sudo mkdir -p /var/www/spellbook
sudo rm -rf /var/www/spellbook/*
sudo cp -a ~/spellbook-dist/. /var/www/spellbook/
sudo chown -R www-data:www-data /var/www/spellbook
sudo find /var/www/spellbook -type d -exec chmod 755 {} \;
sudo find /var/www/spellbook -type f -exec chmod 644 {} \;
sudo nginx -t
sudo systemctl reload nginx

echo "✅ Web deployed successfully"
