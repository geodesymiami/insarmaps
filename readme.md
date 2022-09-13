# Insarmaps

This is web application allows viewing of InSAR displacement time-series, the automatic re-coloring of the InSAR data based on selected dates, and various other geological functions (USGS volcano feed, among others).

It is built using the [Laravel](http://laravel.com/docs) PHP framework.

# Installation instructions
Below are installation instructions to install the web app and all its prerequisites. This was tested on ubuntu 22.04, but should work on Windows/Mac/Other linux distributions by utilizing the equivalent commands in those systems.

1. Make sure packages are up to date:
    ```
    sudo apt update
    sudo apt upgrade
    ```
2. Install apache:
    ```sudo apt install apache2```

3. Clone site from git:
    ```
    git clone https://github.com/geodesymiami/insarmaps.git
    sudo mv insarmaps /var/www/html/
    ```

4. Edit the default .conf file to enable the site:
    ```sudo vi /etc/apache2/sites-enabled/000-default.conf```.

	Edit the file to contain this:
    ```
    <VirtualHost *:80>
        # The ServerName directive sets the request scheme, hostname and port that
        # the server uses to identify itself. This is used when creating
        # redirection URLs. In the context of virtual hosts, the ServerName
        # specifies what hostname must appear in the request's Host: header to
        # match this virtual host. For the default virtual host (this file) this
        # value is not decisive as it is used as a last resort host regardless.
        # However, you must set it for any further virtual host explicitly.
        #ServerName www.example.com

        ServerAdmin webmaster@localhost
        DocumentRoot /var/www/html/insarmaps/public

        <Directory /var/www/html/insarmaps>
            AllowOverride All
        </Directory>

        # Available loglevels: trace8, ..., trace1, debug, info, notice, warn,
        # error, crit, alert, emerg.
        # It is also possible to configure the loglevel for particular
        # modules, e.g.
        #LogLevel info ssl:warn

        ErrorLog ${APACHE_LOG_DIR}/error.log
        CustomLog ${APACHE_LOG_DIR}/access.log combined

        # For most configuration files from conf-available/, which are
        # enabled or disabled at a global level, it is possible to
        # include a line for only one particular virtual host. For example the
        # following line enables the CGI configuration for this host only
        # after it has been globally disabled with "a2disconf".
        #Include conf-available/serve-cgi-bin.conf
    </VirtualHost>

    # vim: syntax=apache ts=4 sw=4 sts=4 sr noet
    ```
5. Install php 7.3 along with sqlite3:
    ```
    sudo apt install software-properties-common
    sudo add-apt-repository -y ppa:ondrej/php
    sudo apt update
    sudo apt install php7.3 libapache2-mod-php7.3 php7.3-common php7.3-curl php7.3-xml php7.3-zip php7.3-pgsql php7.3-cli sqlite3 php7.3-sqlite3
    sudo a2enmod php7.3
    sudo a2enmod rewrite
    sudo service apache2 restart
    ```

6. Edit some php settings needed for the site to work properly:
    ```sudo vi /etc/php/7.3/apache2/php.ini```

	Specifically, make sure the lines below have the following options. These are excessively large on purpose, but they can be tuned down as needed.
    ```
    memory_limit = 128G
    post_max_size = 80G
    upload_max_filesize = 20G
    ```
7. Install composer:
    ```
    php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
    php -r "if (hash_file('sha384', 'composer-setup.php') === '55ce33d7678c5a611085589f1f3ddf8b3c52d662cd01d4ba75c0ee0459970c2200a51f492d557530c71c15d8dba01eae') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;"
    php composer-setup.php
    php -r "unlink('composer-setup.php');"
    sudo mv composer.phar /usr/local/bin/composer
    ```
8. Install extra libraries/files needed by the site:
    ```
    cd /var/www/html/insarmaps
    sudo git checkout tileserverDevelopment # or master branch
    cp .env.example .env
    ```

	Then, run this (type yes when it warns about running as root):
    ```sudo ./setup.sh```

9. Create .htaccess file:
    ```sudo vi public/.htaccess```

	Add this to the file:
    ```
    <IfModule mod_rewrite.c>
        <IfModule mod_negotiation.c>
            Options -MultiViews
        </IfModule>

        RewriteEngine On
        RewriteBase /

        # Redirect Trailing Slashes If Not A Folder...
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^(.*)/$ /$1 [L,R=301]

        # Handle Front Controller...
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteRule ^ index.php [L]

        # Handle Authorization Header
        RewriteCond %{HTTP:Authorization} .
        RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
    </IfModule>
    ```

10. Install postgresql and postgis:
    ```sudo apt install postgresql postgresql-contrib postgis```

11. Create a new postgres user named insaradmin, answer yes to the user being superuser:
    ```sudo -u postgres createuser --interactive```

12. Create a new linux user named insaradmin:
    ```sudo adduser insaradmin```

13. Create the database:
    ```
    sudo -u postgres psql
    create database pgis;
    \q
    ```

14. Edit the insaradmin user's postgres password:
    ```
    sudo -u insaradmin psql pgis
    alter user insaradmin password '<NEW PASSWORD>';
    \q
    ```


15. Create all the necessary tables:
    ```sudo -u insaradmin psql pgis < database/recreate_db/db_create.sql```

16. Populate the users table with a temporary user on the website (username is insarmaps@insarmaps.com, password is insarmaps). This is needed as uploading files to the website requires authentication:
	```php artisan  db:seed  --class=UsersTableSeeder```

18. Edit postgresql listen addresses:
    ```sudo vi /etc/postgresql/<version>/main/postgresql.conf```

	Change ```listen_addresses =``` to ```listen_addresses = '*'``` and make sure the line is not commented with a leading \#.

19. Enable postgres password authentication:
    ```sudo vi /etc/postgresql/<version>/main/pg_hba.conf```
Add this line to the top of the file (make sure it is not commented with a leading \#):
    ```host  all  all 0.0.0.0/0 md5```

	Then, restart the postgresql server:
    ```sudo service postgresql restart```

20. Install the mbtiles server:
    ```
    git clone https://github.com/maptiler/tileserver-php.git
    sudo mv tileserver-php /var/www/html/tileserver

	sudo chown -R yourusername:www-data /var/www/html/tileserver
	sudo chmod -R g+rw /var/www/html/tileserver
    ```
    Change "yourusername" above with the username of the current logged in account.

21. Enable the tileserver in apache:
    ```sudo vi /etc/apache2/sites-available/tileserver.conf```

	Add the following to that file:
    ```
    <VirtualHost *:8888>
        ServerAdmin webmaster@localhost
        DocumentRoot /var/www/html/tileserver

        <Directory /var/www/html/tileserver>
            AllowOverride All
        </Directory>
        <IfModule mod_headers.c>
            Header set Access-Control-Allow-Origin "*"
        </IfModule>

        #ErrorLog ${APACHE_LOG_DIR}/error.log
        #CustomLog ${APACHE_LOG_DIR}/access.log combined
    </VirtualHost>
    ```
22. Enable tileserver .conf file in apache:
    ```sudo a2ensite tileserver```

23. Allow apache to listen on port 8888 (the mbtiles server port):
    ```sudo vi /etc/apache2/ports.conf```
	Add this to that file:
    ```Listen 8888```
	Then restart apache:
    ```sudo service apache2 restart```

24. Then, edit the .env file with the appropriate credentials TODO including mbtiles server adding... and mention neeed trailing slash:



