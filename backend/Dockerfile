FROM php:8.5-apache

# Install system dependencies and PHP extensions required by Laravel.
RUN apt-get update && apt-get install -y \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    unzip \
    git \
    && docker-php-ext-install \
    mbstring \
    pdo_mysql \
    xml \
    zip \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

# Install Composer.
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Set Laravel's public directory as Apache's document root.
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public

RUN sed -ri -e "s!/var/www/html!${APACHE_DOCUMENT_ROOT}!g" \
    /etc/apache2/sites-available/*.conf \
    /etc/apache2/apache2.conf \
    /etc/apache2/conf-available/*.conf

WORKDIR /var/www/html

# Copy Laravel application.
COPY . .

# Install production PHP dependencies.
RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader

# Laravel needs these directories to be writable.
RUN chown -R www-data:www-data \
    storage \
    bootstrap/cache

# Render's default web service port.
ENV PORT=10000

# Configure Apache to listen on Render's port.
RUN sed -i "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf \
    && sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" \
    /etc/apache2/sites-available/000-default.conf

EXPOSE 10000

# Run Laravel setup whenever the container starts.
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]