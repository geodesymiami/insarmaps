default_data_dir=./docker/data
data_dir=${1:-$default_data_dir/postgresql}
mbtiles_dir=${2:-$default_data_dir/mbtiles}
server_ip=${3:-localhost}
sudo docker run -e server_ip=${server_ip} -p 80:80 -p 5432:5432 -p 8888:8888 -it -v $data_dir:/var/lib/postgresql/16/main -v $mbtiles_dir:/mbtiles_dir -d insarmaps_img:latest

