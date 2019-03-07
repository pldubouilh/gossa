FROM alpine

# download and prepare caddy
RUN apk update && apk add curl ca-certificates
RUN curl -L -o caddy.tar.gz "https://github.com/mholt/caddy/releases/download/v0.11.1/caddy_v0.11.1_linux_amd64.tar.gz"
RUN tar xvzf caddy.tar.gz && mv caddy /caddy

# download and prepare gossa
RUN curl -L -o /gossa "https://github.com/pldubouilh/gossa/releases/download/v0.0.6/gossa-linux64"
RUN chmod +x /gossa /caddy

# Caddy config:
# * http basic auth is implemented here, with bob as user and dylan as password
# * to enable https just set a valid domain instead of *:8001 - how simple !
RUN echo -e '\n\
    *:8001\n\
    basicauth / bob dylan\n\
    proxy / 127.0.0.1:8000\n\
'>> /Caddyfile

RUN echo -e '/gossa -h 127.0.0.1 -p 8000 /shared & \n /caddy'>> /start.sh
ENTRYPOINT [ "sh", "/start.sh" ]
