FROM alpine
EXPOSE 8001
COPY gossa /gossa
ENTRYPOINT [ "/gossa", "-h", "0.0.0.0", "/shared" ]
