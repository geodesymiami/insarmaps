service apache2 start

chown postgres:postgres /var/lib/postgresql/16/main

sed -i "s/localhost/${server_ip}/" /var/www/html/insarmaps/.env
sed -i "s/\$config\['dataRoot'\] = '';/\$config['dataRoot'] = '/var/lib/postgresql/16/main';/" /var/www/html/tileserver/tileserver.php
# first time? - set up new cluster with initdb in our persistent directory
if ! test -f /var/lib/postgresql/16/main/INITD; then
    su postgres -c "/usr/lib/postgresql/16/bin/initdb /var/lib/postgresql/16/main"
fi
service postgresql start

if ! test -f /var/lib/postgresql/16/main/INITD; then
    su postgres -c "psql -d postgres -c 'CREATE DATABASE pgis;'"
    su postgres -c "psql -c \"CREATE ROLE insaradmin WITH LOGIN PASSWORD 'insaradmin'\""
    su postgres -c "psql -c \"ALTER DATABASE pgis OWNER TO insaradmin;\""
    su postgres -c "psql -d pgis -f database/recreate_db/db_create.sql"
    php artisan  db:seed  --class=UsersTableSeeder

    touch /var/lib/postgresql/16/main/INITD
fi
bash
