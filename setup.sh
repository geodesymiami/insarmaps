#!/usr/bin/env bash

# runs composer and fixes permissions of some folders

composer install
composer update
chmod -R 777 storage/logs/
chmod -R 777 bootstrap/cache/
chmod -R 777 storage/framework/views/

