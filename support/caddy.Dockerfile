FROM pldubouilh/gossa

# download and prepare caddy
RUN apk update && apk add curl ca-certificates
RUN curl -L -o caddy.tar.gz "https://github.com/caddyserver/caddy/releases/download/v1.0.3/caddy_v1.0.3_linux_amd64.tar.gz"
RUN tar xvzf caddy.tar.gz && mv caddy /caddy

COPY Caddyfile /

ENV UID="1000" GID="1000" HOST="127.0.0.1" PORT="8001" PREFIX="/" HISTORY="true" FOLLOW_SYMLINKS="false" SKIP_HIDDEN_FILES="true" DATADIR="/shared"
EXPOSE 443
RUN echo -e 'exec su-exec ${UID}:${GID} /gossa -h ${HOST} -p ${PORT} -k=${SKIP_HIDDEN_FILES} --history=${HISTORY} --symlinks=${FOLLOW_SYMLINKS} --prefix=${PREFIX} ${DATADIR} & \n /caddy'>> /start.sh
ENTRYPOINT [ "sh", "/start.sh" ]
