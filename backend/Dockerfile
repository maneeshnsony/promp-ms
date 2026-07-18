# ---------- Stage 1: install PHP dependencies with Composer ----------
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
# composer:2 ships without ext-intl (required by codeigniter4/framework); the runtime
# stage installs php84-intl, so only that one check is waived — anything else missing
# should still fail the build.
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --ignore-platform-req=ext-intl
COPY app ./app
RUN composer dump-autoload --optimize --no-dev
COPY . .

# ---------- Stage 2: PHP-FPM runtime — precompiled packages, nothing built at image-build time ----------
FROM alpine:3.24 AS runtime

RUN apk add --no-cache \
        php84 php84-fpm php84-common php84-opcache php84-openssl \
        php84-pdo php84-pdo_pgsql php84-pgsql \
        php84-mbstring php84-intl php84-tokenizer php84-xml php84-dom php84-xmlwriter \
        php84-curl php84-fileinfo php84-session php84-phar php84-ctype php84-zip \
        php84-pecl-pcov \
    && ln -s /usr/bin/php84 /usr/bin/php \
    && ln -s /usr/sbin/php-fpm84 /usr/sbin/php-fpm

WORKDIR /var/www/html
COPY --from=vendor /app /var/www/html
COPY docker/zz-prompt-ms.conf /etc/php84/php-fpm.d/zz-prompt-ms.conf

RUN addgroup -g 1000 www && adduser -G www -g www -s /bin/sh -D www \
    && chown -R www:www /var/www/html/writable

USER www
EXPOSE 9000
CMD ["php-fpm", "-F"]
