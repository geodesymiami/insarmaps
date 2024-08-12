service apache2 start

chown postgres:postgres /var/lib/postgresql/16/main
chgrp -R www-data /mbtiles_dir
chmod g+w /mbtiles_dir

mbtiles_dir=$(echo "/mbtiles_dir" | sed 's/[&\/]/\\&/g')
sed -i "s/localhost:8888\//${server_ip}:8888\/${mbtiles_dir}\//" /var/www/html/insarmaps/.env
sed -i "s/MBTILES_DIR=\/mbtiles_dir/MBTILES_DIR=${mbtiles_dir}/" /var/www/html/insarmaps/.env
sed -i "s/\$config\['dataRoot'\] = '';/\$config['dataRoot'] = '${mbtiles_dir}';/" /var/www/html/tileserver/tileserver.php
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
