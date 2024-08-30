FROM docker.io/library/golang:1.23.0-alpine AS builder
RUN apk add --no-cache make
WORKDIR /gossaSrc
COPY . /gossaSrc
RUN make

FROM docker.io/library/alpine:3.20
ENV UID="1000" GID="1000" HOST="0.0.0.0" PORT="8001" PREFIX="/" FOLLOW_SYMLINKS="false" SKIP_HIDDEN_FILES="true" DATADIR="/shared" READONLY="false" VERB="false"
COPY --from=builder /gossaSrc/gossa /gossa
RUN addgroup -g ${GID} user \
    && adduser -D -u ${UID} -G user user
WORKDIR ${DATADIR}
RUN chown ${UID}:${GID} ${DATADIR}
USER ${UID}:${GID}
ENTRYPOINT /gossa -h ${HOST} -p ${PORT} -k=${SKIP_HIDDEN_FILES} -ro=${READONLY} --symlinks=${FOLLOW_SYMLINKS} --prefix=${PREFIX} --verb=${VERB} ${DATADIR}
HEALTHCHECK --timeout=5s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider 127.0.0.1:8001 || exit 1