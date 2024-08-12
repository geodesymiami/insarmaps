data_dir=${1:-./docker/data}
server_ip=${2:-localhost}
sudo docker run -e server_ip=${server_ip} -p 80:80 -p 5432:5432 -p 8888:8888 -it -v $data_dir:/var/lib/postgresql/16/main  insarmaps_img:latest

