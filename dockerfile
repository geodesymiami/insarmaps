FROM ubuntu:latest

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update
RUN apt-get install -y software-properties-common
RUN add-apt-repository -y ppa:ondrej/php
RUN apt-get update && apt-get install -y \
    php7.3 libapache2-mod-php7.3 php7.3-common php7.3-curl php7.3-xml php7.3-zip php7.3-pgsql php7.3-cli sqlite3 php7.3-sqlite3 git postgresql postgresql-contrib postgis

RUN a2enmod php7.3
RUN a2enmod rewrite

RUN sed -i 's/memory_limit = .*/memory_limit = 128G/' /etc/php/7.3/apache2/php.ini
RUN sed -i 's/post_max_size = .*/post_max_size = 80G/' /etc/php/7.3/apache2/php.ini
RUN sed -i 's/upload_max_filesize = .*/upload_max_filesize = 20G/' /etc/php/7.3/apache2/php.ini

RUN sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/16/main/postgresql.conf
RUN sed -i "s/local   all             postgres                                peer/local   all             all                                peer/" /etc/postgresql/16/main/pg_hba.conf
RUN sed -i "s/host    all             all             127.0.0.1\/32            scram-sha-256/host    all             all             0.0.0.0\/0            scram-sha-256/" /etc/postgresql/16/main/pg_hba.conf
RUN sed -i "s/Listen 80/Listen 80\nListen 8888/" /etc/apache2/ports.conf

RUN useradd -ms /bin/bash insaradmin
RUN echo "insaradmin:insaradmin" | chpasswd

RUN php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
RUN php -r "if (hash_file('sha384', 'composer-setup.php') === 'dac665fdc30fdd8ec78b38b9800061b4150413ff2e3b6f88543c636f7cd84f6db9189d43a81e5503cda447da73c7e5b6') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;"

RUN php composer-setup.php
RUN php -r "unlink('composer-setup.php');"
RUN mv composer.phar /usr/local/bin/composer

# DEBUG (ssh support)
# --------------------------------------------
# RUN apt-get update && apt-get install -y openssh-server
# RUN sed -i 's/PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
# RUN echo "root:root" | chpasswd
# 
# EXPOSE 22
# 
# #ENTRYPOINT service ssh start && bash
# --------------------------------------------

RUN git clone https://github.com/maptiler/tileserver-php.git
RUN mv tileserver-php /var/www/html/tileserver
RUN chown -R root:www-data /var/www/html/tileserver
RUN chmod -R g+rw /var/www/html/tileserver

COPY ./docker/tileserver.conf /etc/apache2/sites-available/tileserver.conf
RUN a2ensite tileserver
COPY ./docker/000-default.conf /etc/apache2/sites-enabled/000-default.conf

RUN mkdir /var/www/html/insarmaps
WORKDIR /var/www/html/insarmaps
COPY . .

RUN cp ./docker/.env_docker .env

RUN ./setup.sh

COPY ./docker/docker.htaccess public/.htaccess

# Create a volume for persistent data
#VOLUME /var/lib/postgresql/16/main

EXPOSE 5432
EXPOSE 80
EXPOSE 8888

CMD /var/www/html/insarmaps/docker/configure_servers.sh

