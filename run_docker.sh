sudo docker run -p 80:80 -p 5432:5432 -p 8888:8888 -it -v ./docker/data:/var/lib/postgresql/16/main  insarmaps_img:latest
