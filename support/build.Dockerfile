FROM golang:1.18 as builder
COPY . /gossaSrc
RUN cd /gossaSrc && make

FROM alpine:3.15
ENV UID="1000" GID="1000" HOST="0.0.0.0" PORT="8001" PREFIX="/" FOLLOW_SYMLINKS="false" SKIP_HIDDEN_FILES="true" DATADIR="/shared" READONLY="false" VERB="false"
RUN apk add --no-cache su-exec
COPY ./support/entrypoint.sh /entrypoint.sh
COPY --from=builder /gossaSrc/gossa /gossa
ENTRYPOINT "/entrypoint.sh"
