FLAGS := -ldflags "-s -w" -trimpath
NOCGO := CGO_ENABLED=0

build::
	go vet && go fmt
	${NOCGO} go build ${FLAGS} -o gossa

install::
	sudo cp gossa /usr/local/bin

run::
	./gossa -verb=true test-fixture

run-ro::
	./gossa -verb=true -ro=true test-fixture

run-extra::
	./gossa -verb=true -prefix="/fancy-path/" -k=false -symlinks=true test-fixture

lint-js::
	standard

ci:: build-all test lint-js
	echo "done"

test::
	-@cd test-fixture && ln -s ../support .; true
	go test -cover -c -tags testrunmain

	timeout -s SIGINT 3 ./gossa.test -test.coverprofile=normal.out -test.run '^TestRunMain' -verb=true test-fixture &
	sleep 2
	go test -run TestNormal
	sleep 1

	timeout -s SIGINT 3 ./gossa.test -test.coverprofile=extra.out -test.run '^TestRunMain' -prefix='/fancy-path/' -k=false -symlinks=true test-fixture &
	sleep 2
	go test -run TestExtra
	sleep 1

	timeout -s SIGINT 3 ./gossa.test -test.coverprofile=ro.out -test.run '^TestRunMain' -ro=true test-fixture &
	sleep 2
	go test -run TestRo
	sleep 1

	# gocovmerge ro.out extra.out normal.out > all.out
	# go tool cover -html all.out
	# go tool cover -func=all.out | grep main | grep '9.\..\%'

watch::
	ls gossa.go gossa_test.go ui/* | entr -rc make build run

watch-extra::
	ls gossa.go gossa_test.go ui/* | entr -rc make build run-extra

watch-ro::
	ls gossa.go gossa_test.go ui/* | entr -rc make build run-ro

watch-test::
	ls gossa.go gossa_test.go ui/* | entr -rc make test

build-all:: build
	${NOCGO}  GOOS=linux    GOARCH=amd64  go build ${FLAGS} -o builds/gossa-linux-x64
	${NOCGO}  GOOS=linux    GOARCH=arm    go build ${FLAGS} -o builds/gossa-linux-arm
	${NOCGO}  GOOS=linux    GOARCH=arm64  go build ${FLAGS} -o builds/gossa-linux-arm64
	${NOCGO}  GOOS=darwin   GOARCH=amd64  go build ${FLAGS} -o builds/gossa-mac-x64
	${NOCGO}  GOOS=darwin   GOARCH=arm64  go build ${FLAGS} -o builds/gossa-mac-arm64
	${NOCGO}  GOOS=windows  GOARCH=amd64  go build ${FLAGS} -o builds/gossa-windows.exe
	sha256sum builds/*

clean::
	rm -f gossa
	rm -f gossa-linux64
	rm -f gossa-linux-arm
	rm -f gossa-linux-arm64
	rm -f gossa-mac
	rm -f gossa-windows.exe

