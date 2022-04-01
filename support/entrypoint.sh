#!/bin/sh
exec su-exec ${UID}:${GID} /gossa -h ${HOST} -p ${PORT} -k=${SKIP_HIDDEN_FILES} -ro=${READONLY} --symlinks=${FOLLOW_SYMLINKS} --prefix=${PREFIX} --verb=${VERB} ${DATADIR}
