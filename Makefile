build:
	make embed
	go build gossa.go
	rm gossa.go

build-all:
	make embed
	env GOOS=linux GOARCH=amd64 go build gossa.go
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
	-rm gossa
	-rm gossa-linux64
	-rm gossa-linux-arm
	-rm gossa-linux-arm64
	-rm gossa-mac
	-rm gossa-windows.exe

embed:
	echo "embedding css and js into binary"
	cp main.go gossa.go
	perl -pe 's/css_will_be_here/`cat style.css`/ge' -i gossa.go
	perl -pe 's/js_will_be_here/`cat script.js`/ge' -i gossa.go

ci:
	go fmt
	go vet
	timeout 5 go run main.go fixture &
	sleep 1 && go test

ci-watch:
	ls main.go script.js main_test.go | entr -rc make ci

watch:
	ls main.go script.js | entr -rc make run

run:
	make embed
	go run gossa.go fixture
	rm gossa.go
