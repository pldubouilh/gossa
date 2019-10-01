FROM alpine

ENV UID="1000" GID="1000" HOST="0.0.0.0" PORT="8001" PREFIX="/" FOLLOW_SYMLINKS="false" SKIP_HIDDEN_FILES="true" DATADIR="/shared"
EXPOSE 8001

RUN apk add --no-cache su-exec
RUN wget https://github.com/pldubouilh/gossa/releases/download/v0.0.8/gossa-linux64 && mv gossa-linux64 /gossa && chmod +x /gossa

RUN echo -e 'exec su-exec ${UID}:${GID} /gossa -h ${HOST} -p ${PORT} -k=${SKIP_HIDDEN_FILES} --symlinks=${FOLLOW_SYMLINKS} --prefix=${PREFIX} ${DATADIR}'>> /start.sh
ENTRYPOINT [ "sh", "/start.sh" ]
