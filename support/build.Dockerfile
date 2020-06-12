FROM golang:latest as builder
COPY . /gossaSrc
RUN cd /gossaSrc && make

FROM alpine
ENV UID="1000" GID="1000" HOST="0.0.0.0" PORT="8001" PREFIX="/" FOLLOW_SYMLINKS="false" SKIP_HIDDEN_FILES="true" DATADIR="/shared" READONLY="false"
EXPOSE 8001
RUN apk add --no-cache su-exec
COPY --from=builder /gossaSrc/gossa /gossa
RUN echo -e 'exec su-exec ${UID}:${GID} /gossa -h ${HOST} -p ${PORT} -k=${SKIP_HIDDEN_FILES} -ro=${READONLY} --symlinks=${FOLLOW_SYMLINKS} --prefix=${PREFIX} ${DATADIR}'>> /start.sh
ENTRYPOINT [ "sh", "/start.sh" ]
