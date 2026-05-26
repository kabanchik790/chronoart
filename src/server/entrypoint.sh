#!/bin/sh
set -e
echo "Running migrations..."
npx sequelize-cli db:migrate --env production
echo "Starting server..."
exec node app.js
