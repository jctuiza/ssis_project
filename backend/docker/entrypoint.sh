#!/bin/sh

set -e

cd /var/www/html

echo "Starting Laravel application..."

echo "Clearing Laravel caches..."
php artisan config:clear
php artisan route:clear
php artisan view:clear

echo "Running database migrations..."
php artisan migrate --force --no-interaction

echo "Running database seeders..."
php artisan db:seed --force --no-interaction

echo "Starting Laravel HTTP server..."

exec php artisan serve \
    --host=0.0.0.0 \
    --port="${PORT:-10000}"