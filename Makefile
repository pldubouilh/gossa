build:
	cp src/gossa.go gossa.go
	make -C gossa-ui/
	go vet && go fmt
	CGO_ENABLED=0 go build gossa.go
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
	-rm gossa_test.go
	-@cd test-fixture && ln -s ../support .
	cp src/gossa_test.go .
	go test

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
	env CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build gossa.go
	mv gossa gossa-linux64
	env GOOS=linux GOARCH=arm go build gossa.go
	mv gossa gossa-linux-arm
	env GOOS=linux GOARCH=arm64 go build gossa.go
	mv gossa gossa-linux-arm64
	env GOOS=darwin GOARCH=amd64 go build gossa.go
	mv gossa gossa-mac
	env GOOS=windows GOARCH=amd64 go build gossa.go
	mv gossa.exe gossa-windows.exe
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
