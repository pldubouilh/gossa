```sh
# download latest gossa release
docker build -t gossa -f download.Dockerfile .

# ... or build gossa within a build container, needs to be ran within the sources, ../ from here
docker build -t gossa -f docker/build.Dockerfile .

# and to run it simply
sudo docker run -v ~/LocalDirToShare:/shared -p 8001:8001 gossa
```


a fancy docker image using [Caddy](https://caddyserver.com/) is also provided. a simple config is embedded in the docker file, and shows how to use http basic authentication, and automatic TLS for hands-free https 🎉

```sh
# run with caddy, checkout the config in the dockerfile
docker build -t gossa -f caddy.Dockerfile .

# run with caddy
sudo docker run -v ~/LocalDirToShare:/shared --net=host gossa
```

