FLAGS := -ldflags "-s -w"
NOCGO := CGO_ENABLED=0

build:
	go vet && go fmt
	${NOCGO} go build ${FLAGS} -o gossa

install:
	sudo cp gossa /usr/local/bin

run:
	./gossa -verb=true test-fixture

run-ro:
	./gossa -verb=true -ro=true test-fixture

run-extra:
	./gossa -verb=true -prefix="/fancy-path/" -k=false -symlinks=true test-fixture

test:
	make build
	-@cd test-fixture && ln -s ../support .; true

	-@killall gossa; true
	-make run &
	go test -run TestNormal

	killall gossa
	sleep 1
	-make run-extra &
	go test -run TestExtra

	killall gossa
	sleep 1
	-make run-ro &
	go test -run TestRo

	killall gossa

watch:
	ls gossa.go gossa_test.go gossa-ui/* | entr -rc make build run

watch-extra:
	ls gossa.go gossa_test.go gossa-ui/* | entr -rc make build run-extra

watch-ro:
	ls gossa.go gossa_test.go gossa-ui/* | entr -rc make build run-ro

watch-test:
	ls gossa.go gossa_test.go gossa-ui/* | entr -rc make test

build-all:
	${NOCGO}  GOOS=linux    GOARCH=amd64  go build ${FLAGS} -o build-all/gossa-linux64
	${NOCGO}  GOOS=linux    GOARCH=arm    go build ${FLAGS} -o build-all/gossa-linux-arm
	${NOCGO}  GOOS=linux    GOARCH=arm64  go build ${FLAGS} -o build-all/gossa-linux-arm64
	${NOCGO}  GOOS=darwin   GOARCH=amd64  go build ${FLAGS} -o build-all/gossa-mac64
	${NOCGO}  GOOS=darwin   GOARCH=arm64  go build ${FLAGS} -o build-all/gossa-mac-arm64
	${NOCGO}  GOOS=windows  GOARCH=amd64  go build ${FLAGS} -o build-all/gossa-windows.exe

clean:
	-rm gossa
	-rm gossa-linux64
	-rm gossa-linux-arm
	-rm gossa-linux-arm64
	-rm gossa-mac
	-rm gossa-windows.exe

