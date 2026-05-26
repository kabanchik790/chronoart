#!/bin/bash
set -e

echo "=== Deploy started: $(date) ==="

git pull origin main

echo "--- Building client ---"
cd src/client
npm ci
npm run build
mkdir -p /var/www/chronoart
cp -r dist/* /var/www/chronoart/
cd ../..

echo "--- Updating containers ---"
docker compose pull
docker compose up -d --build

echo "=== Deploy done: $(date) ==="
