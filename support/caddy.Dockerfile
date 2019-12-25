FROM golang:latest as builder
COPY . /gossaSrc
RUN cd /gossaSrc && make

FROM alpine
ENV UID="1000" GID="1000" HOST="127.0.0.1" PORT="8001" PREFIX="/" FOLLOW_SYMLINKS="false" SKIP_HIDDEN_FILES="true" DATADIR="/shared"
EXPOSE 443
RUN apk update && apk add --no-cache su-exec curl ca-certificates caddy
COPY --from=builder /gossaSrc/gossa /gossa
RUN echo -e 'exec su-exec ${UID}:${GID} /gossa -h ${HOST} -p ${PORT} -k=${SKIP_HIDDEN_FILES} --symlinks=${FOLLOW_SYMLINKS} --prefix=${PREFIX} ${DATADIR} & \n caddy' > /start.sh
ENTRYPOINT [ "sh", "/start.sh" ]
