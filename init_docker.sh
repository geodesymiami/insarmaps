#!/usr/bin/env bash

function display_help() {
    echo "Usage: init_docker.sh"
    echo
    echo "Examples:"
    echo "  init_docker.sh "
    echo
    echo "This script installs the insarmaps docker container. Run it using:"
    echo "         run_docker.sh  "
    echo
    echo "         For usage see:"
    echo "         run_docker.sh --help"
    echo
}

# Check for help argument
if [[ "$1" == "--help" || "$1" == "-help" ]]; then
    display_help
    exit 0
fi

# needs sudo due to permissions that end up being set on this persistent dir
sudo rm -rf ./docker/data
mkdir ./docker/data
mkdir ./docker/data/postgresql
mkdir ./docker/data/mbtiles
sudo docker build -t insarmaps_img .

