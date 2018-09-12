gossa
=============

![e](https://user-images.githubusercontent.com/760637/45410804-f2c00e80-b672-11e8-8c2b-51d7fc0915aa.gif)

🎶 A fast and simple webserver for your files. It's dependency-free and with under 250 lines for the server code, easily code-reviewable.

### features
  * upload files and folders with drag-and-drop
  * browse throughout files/directories
  * create new folders
  * browse throughout pictures with a full-screen carousel
  * simple keyboard navigation/shortcuts
  * fast ; fills my 80MB/s AC wifi link

### run
```sh
# run
go run main.go fixture

# build embedding the js/css in the binary
make
./gossa --help

# run CI tests
make ci
```

### keyboard shortcuts
  * Arrows  browse throughout the files/directories and pictures
  * Ctrl/Meta + C  copy selected path to clipboard
  * Ctrl/Meta + D  create a new directory

### built blobs
built blobs are available on the [release page](https://github.com/pldubouilh/gossa/releases).
