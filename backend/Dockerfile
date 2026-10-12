FROM php:8.5-cli

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
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader

RUN mkdir -p \
    storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

ENV PORT=10000

EXPOSE 10000

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]