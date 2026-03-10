FROM php:8.2-cli

WORKDIR /app

# Instala Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Copia el código fuente
COPY . .

# Instala dependencias PHP si tienes composer.json
RUN if [ -f composer.json ]; then composer install; fi

EXPOSE 10000

CMD ["php", "-S", "0.0.0.0:10000"]