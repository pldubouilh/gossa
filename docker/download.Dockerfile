FROM alpine
EXPOSE 8001
RUN wget https://github.com/pldubouilh/gossa/releases/download/v0.0.7/gossa-linux64 && mv gossa-linux64 /gossa && chmod +x /gossa
ENTRYPOINT [ "/gossa", "-h", "0.0.0.0", "/shared" ]

