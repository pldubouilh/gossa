FROM golang:latest as builder
COPY . /gossaSrc
RUN cd /gossaSrc && make

FROM alpine
EXPOSE 8001
COPY --from=builder /gossaSrc/gossa /gossa
ENTRYPOINT [ "/gossa", "-h", "0.0.0.0", "/shared" ]
