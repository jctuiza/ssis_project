#!/bin/sh

set -e

echo "Starting Laravel application..."

echo "Clearing Laravel configuration cache..."
php artisan config:clear

echo "Running database migrations..."
php artisan migrate --force --no-interaction

echo "Running database seeders..."
php artisan db:seed --force --no-interaction

echo "Starting Apache..."
exec apache2-foreground