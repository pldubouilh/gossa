FLAGS := -ldflags "-s -w"
NOCGO := CGO_ENABLED=0

build:
	cp src/gossa.go gossa.go
	make -C gossa-ui/
	go vet && go fmt
	${NOCGO} go build ${FLAGS} -o gossa
	rm gossa.go

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
	rm -rf gossa_test.go
	-@cd test-fixture && ln -s ../support .; true
	cp src/gossa_test.go .

	-@killall gossa; true
	-make run &
	go test -run TestNormal

	killall gossa
	-make run-extra &
	go test -run TestExtra

	killall gossa
	-make run-ro &
	go test -run TestRo

	killall gossa

watch:
	ls src/* gossa-ui/* | entr -rc make build run

watch-extra:
	ls src/* gossa-ui/* | entr -rc make build run-extra

watch-ro:
	ls src/* gossa-ui/* | entr -rc make build run-ro

watch-test:
	ls src/* gossa-ui/* | entr -rc make test

build-all:
	cp src/gossa.go gossa.go
	make -C gossa-ui/
	${NOCGO}  GOOS=linux    GOARCH=amd64  go build ${FLAGS} -o build-all/gossa-linux64
	${NOCGO}  GOOS=linux    GOARCH=arm    go build ${FLAGS} -o build-all/gossa-linux-arm
	${NOCGO}  GOOS=linux    GOARCH=arm64  go build ${FLAGS} -o build-all/gossa-linux-arm64
	${NOCGO}  GOOS=darwin   GOARCH=amd64  go build ${FLAGS} -o build-all/gossa-mac
	${NOCGO}  GOOS=windows  GOARCH=amd64  go build ${FLAGS} -o build-all/gossa-windows.exe
	rm gossa.go

clean:
	-rm gossa.go
	-rm gossa_test.go
	-rm gossa
	-rm gossa-linux64
	-rm gossa-linux-arm
	-rm gossa-linux-arm64
	-rm gossa-mac
	-rm gossa-windows.exe

