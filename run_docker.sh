#!/usr/bin/env bash

function display_help() {
    echo "Usage: run_docker.sh  postgres_dir mbtiles_dir server_ip"
    echo
    echo "Arguments:"
    echo "  data_dir     Directory for PostgreSQL data (default: ./docker/data/postgresql)"
    echo "  mbtiles_dir  Directory for MBTiles data (default: ./docker/data/mbtiles)"
    echo "  server_ip    Server IP address (default: localhost)"
    echo
    echo "Examples:"
    echo "  ./run_docker.sh  /data/postgres_dir /data/mbtiles_dir server_ip"
    echo "  ./run_docker.sh  /data/insarmaps1/postgres_dir /data/insarmaps1/mbtiles_dir $REMOTEHOST_INSARMAPS1"
    echo "  ./run_docker.sh  /data/insarmaps2/postgres_dir /data/insarmaps2/mbtiles_dir $REMOTEHOST_INSARMAPS2"
    echo "  ./run_docker.sh  /data/insarmaps3/postgres_dir /data/insarmaps3/mbtiles_dir $REMOTEHOST_INSARMAPS3"
    echo "  ./run_docker.sh  ~/Documents/postgres_dir ~/Documents/mbtiles_dir localhost"
    echo
    echo "This script runs a Docker container for insarmaps with the following settings:"
    echo "  - PostgreSQL data directory mounted inside the container to /var/lib/postgresql/16/main"
    echo "  - MBTiles data directory mounted inside the container to /mbtiles_dir"
    echo "  - Server IP address set as an environment variable inside the container"
    echo
    echo "To check the status, run:"
    echo "    sudo docker container ls "
    echo
    echo "To make space remove unused containers:"
    echo "    sudo docker system prune -a"
    echo
    echo "To update the container after modifications to the insarmaps repositor (example))"
    echo '     container_id=$(sudo docker container ls --format "{{.ID}}")'
    echo '     sudo docker stop $container_id '
    echo '     sudo docker remove $container_id '
    echo '     sudo docker system prune -a'
    echo '     ./init_docker.sh'
    echo '     ./run_docker.sh  /data/insarmaps2/postgres_dir /data/insarmaps2/mbtiles_dir $REMOTEHOST_INSARMAPS2'
    echo
    echo "After data ingestion you can view the data using:"
    echo "               http://149.165.153.50"
    echo "               http://localhost"
    echo
}

# Check for help argument
if [[ "$1" == "--help" || "$1" == "-help" || "$#" -eq 0 ]]; then
    display_help
    exit 0
fi

default_data_dir=./docker/data

data_dir=${1:-$default_data_dir/postgresql}
mbtiles_dir=${2:-$default_data_dir/mbtiles}
server_ip=${3:-localhost}

sudo docker run -e server_ip=${server_ip} -p 80:80 -p 443:443 -p 5432:5432 -p 8888:8888 -it -v $data_dir:/postgresql_data -v $mbtiles_dir:/mbtiles_dir -d --restart unless-stopped insarmaps_img:latest

