#!/bin/sh
set -e

echo "[startup] Hagi-Shop startet..."
echo "[startup] Prisma Schema synchronisieren..."
npx prisma db push --accept-data-loss=false
echo "[startup] Schema OK. Starte Server..."
exec node server.js
