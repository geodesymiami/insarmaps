# needs sudo due to permissions that end up being set on this persistent dir
sudo rm -rf ./docker/data
mkdir ./docker/data
mkdir ./docker/data/postgresql
mkdir ./docker/data/mbtiles
sudo docker build -t insarmaps_img .

