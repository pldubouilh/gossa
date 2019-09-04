FROM pldubouilh/gossa

# download and prepare caddy
RUN apk update && apk add curl ca-certificates
RUN curl -L -o caddy.tar.gz "https://github.com/caddyserver/caddy/releases/download/v1.0.3/caddy_v1.0.3_linux_amd64.tar.gz"
RUN tar xvzf caddy.tar.gz && mv caddy /caddy

COPY Caddyfile /

RUN echo -e '/gossa -h 127.0.0.1 /shared & \n /caddy'>> /start.sh
ENTRYPOINT [ "sh", "/start.sh" ]
