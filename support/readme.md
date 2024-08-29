## run as a service

use the `service` file provided here to use as a systemd service.

```sh
# edit service file

# copy over our service, and start. Notice no sudo with systemctl command !
% mkdir -p ~/.config/systemd/user/
% cp service ~/.config/systemd/user/gossa.service
% systemctl --user start gossa

# enable at boot time
% systemctl --user enable gossa
```

## run with docker

the master branch is automatically built and pushed to [dockerhub](https://hub.docker.com/r/pldubouilh/gossa) under `pldubouilh/gossa`.

```sh
# pull from dockerhub and run
% mkdir ~/LocalDirToShare
% sudo docker run -v ~/LocalDirToShare:/shared -p 8001:8001 pldubouilh/gossa

# options are settable through env. variabes. all the options are the build.Dockerfile
% sudo docker run -e PREFIX="/gossa/" -v ~/LocalDirToShare:/shared -p 8001:8001 pldubouilh/gossa
```

if you prefer building the image yourself :

```sh
# build gossa within a build container, needs to be ran within the sources, ../ from here, and run
% mkdir ~/LocalDirToShare
% docker build -t gossa -f support/build.Dockerfile .
% sudo docker run -v ~/LocalDirToShare:/shared -p 8001:8001 gossa
```

a docker-compose example image is also provided. running docker compose should be straightforward : `docker-compose up .` have a look in `docker-compose.yml` for further configuration.

## multi-account setup with Caddy

authentication / user routing has been left out of the design of gossa, as simple tools are already available for this purpose. [caddy](https://caddyserver.com) is used here as an example, but other proxy can be used in a similar fashion.

### example 1 root, multiple read-only users

This sample Caddyfile will
 + enable https on the domain myserver.com (http will be automatically redirected to https)
 + password protect the access
 + route the root user requests to 1 gossa instance
 + route user1 and user2 requests to a readonly gossa instance

<details>
  <summary>Legacy Caddy v1 Caddyfile</summary>
  
  ```sh
  myserver.com
  
  # proxy regular and read only instance
  proxy /   127.0.0.1:8001
  proxy /ro 127.0.0.1:8002 { without /ro }
  
  # reroute non-root user to read-only
  # cm9... is the output of `printf "root:password" | base64`
  rewrite {
    if {>Authorization} not "Basic cm9vdDpwYXNzd29yZA=="
    to /ro/{path}
  }
  
  # gate access
  basicauth / root     password
  basicauth / ro_user1 passworduser1
  basicauth / ro_user2 passworduser2
  ```
</details>

Caddy v2 Caddyfile

```sh
myserver.com

# gate access
basic_auth {
  root $2a$14$Zkx19XLiW6VYouLHR5NmfOFU0z2GTNmpkT/5qqR7hx4IjWJPDhjvG # password is "hiccup"
  ro_user1 $2a$14$Zkx19XLiW6VYouLHR5NmfOFU0z2GTNmpkT/5qqR7hx4IjWJPDhjvG # password is "hiccup"
  ro_user2 $2a$14$Zkx19XLiW6VYouLHR5NmfOFU0z2GTNmpkT/5qqR7hx4IjWJPDhjvG # password is "hiccup"
}

# named matcher for root user
@isroot {
  vars {http.auth.user.id} root
}

# proxy regular and read only instance
handle @isroot {
  reverse_proxy 127.0.0.1:8001
}
# route non-root user to read only instance
handle {
  reverse_proxy 127.0.0.1:8002
}
```

then simply start the 2 gossa instances, and caddy

```sh
# start an instance in readonly
% ./gossa -ro=true -p 8002 ~/folder &

# start an instance with access to hidden files
% ./gossa -k=false  -p 8001 ~/folder &

# start caddy
% ./caddy
```

### example 2 users on 2 different folders

This sample Caddyfile will
 + enable https on the domain myserver.com (http will be automatically redirected to https)
 + password protect the access
 + route user1 to own folder
 + route user2 to own folder
 + share a folder between 2 users with a symlink

<details>
  <summary>Legacy Caddy v1 Caddyfile</summary>

  ```sh
  myserver.com
  
  proxy /user1 127.0.0.1:8001 { without /user1 }
  proxy /user2 127.0.0.1:8002 { without /user2 }
  
  basicauth / user1 passworduser1
  basicauth / user2 passworduser2
  
  rewrite {
    if {>Authorization} is "Basic dXNlcjE6cGFzc3dvcmR1c2VyMQ=="
    to /user1/{path}
  }
  
  rewrite {
    if {>Authorization} is "Basic dXNlcjI6cGFzc3dvcmR1c2VyMg=="
    to /user2/{path}
  }
  ```
</details>

Caddy v2 Caddyfile

```sh
myserver.com

basic_auth {
  user1 $2a$14$Zkx19XLiW6VYouLHR5NmfOFU0z2GTNmpkT/5qqR7hx4IjWJPDhjvG # password is "hiccup"
  user2 $2a$14$Zkx19XLiW6VYouLHR5NmfOFU0z2GTNmpkT/5qqR7hx4IjWJPDhjvG # password is "hiccup"
}

@user1auth {
  vars {http.auth.user.id} user1 
}
handle @user1auth {
  reverse_proxy 127.0.0.1:8001
}

@user2auth {
  vars {http.auth.user.id} user2
}
handle @user2auth {
  reverse_proxy 127.0.0.1:8002
}
```

start 2 gossa instances, and caddy

```sh
# create symlink to share folder between 2 users
% ln -s /path/shared test/user1
% ln -s /path/shared test/user2

# start gossa & caddy
% ./gossa -p 8001 -symlinks=true test/user1 &
% ./gossa -p 8002 -symlinks=true test/user2 &
% ./caddy
```

## nginx setup

In order to allow for larger uploads, it's recommended to increase the maximum body size on your nginx config :

```
# increase maximum request size
client_max_body_size 100M;
```
