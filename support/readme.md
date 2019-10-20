the master branch is automatically built and pushed to [dockerhub](https://hub.docker.com/r/pldubouilh/gossa) under `pldubouilh/gossa`.

```sh
# pull from dockerhub and run
% sudo docker run -v ~/LocalDirToShare:/shared -p 8001:8001 pldubouilh/gossa
```

if you prefer building the image yourself :

```sh
# build gossa within a build container, needs to be ran within the sources, ../ from here, and run
% docker build -t gossa -f support/build.Dockerfile .
% sudo docker run -v ~/LocalDirToShare:/shared -p 8001:8001 gossa
```

the options are settable through environment variables that can be passed starting off the docker image.

a fancy docker image using [Caddy](https://caddyserver.com/) is also provided. a simple config is embedded in the docker file, and shows how to use http basic authentication, and automatic TLS for hands-free https 🎉

```sh
# checkout the caddy config, build, and run docker image
% vim caddy.Dockerfile
% docker build -t gossa-caddy -f caddy.Dockerfile .
% sudo docker run -v ~/LocalDirToShare:/shared --net=host gossa-caddy
```

a docker-compose example image is also provided. running docker compose should be straightforward : `docker-compose up .` have a look in `docker-compose.yml` for further configuration.