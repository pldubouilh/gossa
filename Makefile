build:
	make embed
	go build gossa.go
	rm gossa.go

embed:
	echo "embedding css and js into binary"
	cp src/main.go gossa.go
	perl -pe 's/css_will_be_here/`cat src\/style.css`/ge' -i gossa.go
	perl -pe 's/js_will_be_here/`cat src\/script.js`/ge' -i gossa.go

run:
	make build
	./gossa fixture

ci:
	cd src && go vet && go fmt
	timeout 5 make run &
	cd src && sleep 1 && go test

ci-watch:
	ls src/*  | entr -rc make ci

watch:
	ls src/* | entr -rc make run

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
