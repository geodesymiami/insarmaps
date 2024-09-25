service apache2 start

chown postgres:postgres /postgresql_data
chgrp -R www-data /mbtiles_dir
chmod g+w /mbtiles_dir

mbtiles_dir=$(echo "/mbtiles_dir" | sed 's/[&\/]/\\&/g')
sed -i "s/http:\/\/localhost:8888\//http:\/\/${server_ip}:8888\/${mbtiles_dir}\//" /var/www/html/insarmaps/.env
sed -i "s/MBTILES_DIR=\/mbtiles_dir/MBTILES_DIR=${mbtiles_dir}/" /var/www/html/insarmaps/.env
sed -i "s/\$config\['dataRoot'\] = '';/\$config['dataRoot'] = '${mbtiles_dir}';/" /var/www/html/tileserver/tileserver.php
# first time? - set up new cluster with initdb in our persistent directory
if ! test -f /postgresql_data/INITD; then
    su postgres -c "/usr/lib/postgresql/9.6/bin/initdb /postgresql_data"
fi
service postgresql start

if ! test -f /postgresql_data/INITD; then
    su postgres -c "psql -d postgres -c 'CREATE DATABASE pgis;'"
    su postgres -c "psql -c \"CREATE ROLE insaradmin WITH LOGIN PASSWORD 'insaradmin'\""
    su postgres -c "psql -c \"ALTER DATABASE pgis OWNER TO insaradmin;\""
    su postgres -c "psql -d pgis -f database/recreate_db/db_create.sql"
    php artisan  db:seed  --class=UsersTableSeeder

    touch /postgresql_data/INITD
fi
bash
