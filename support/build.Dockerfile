FROM golang:1.18 as builder
WORKDIR /gossaSrc
COPY . /gossaSrc
RUN make

FROM docker.io/library/alpine:3.20
ENV UID="1000" GID="1000" HOST="0.0.0.0" PORT="8001" PREFIX="/" FOLLOW_SYMLINKS="false" SKIP_HIDDEN_FILES="true" DATADIR="/shared" READONLY="false" VERB="false"
RUN apk add --no-cache su-exec
COPY ./support/entrypoint.sh /entrypoint.sh
COPY --from=builder /gossaSrc/gossa /gossa
USER nobody
ENTRYPOINT "/entrypoint.sh"
HEALTHCHECK --timeout=5s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider 127.0.0.1:8001 || exit 1