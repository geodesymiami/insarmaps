#!/usr/bin/env bash

# runs composer and fixes permissions of some folders

composer install --no-plugins
composer update
chmod -R 777 storage/logs/
chmod -R 777 bootstrap/cache/
chmod -R 777 storage/framework/views/
chmod -R 777 storage/framework/sessions/

# make sure .env is created by here
php artisan key:generate
