gossa
=============

![e](https://user-images.githubusercontent.com/760637/45410804-f2c00e80-b672-11e8-8c2b-51d7fc0915aa.gif)

[![Build Status](https://travis-ci.org/pldubouilh/gossa.svg?branch=master)](https://travis-ci.org/pldubouilh/gossa)

🎶 A fast and simple webserver for your files, that's dependency-free and with under 210 lines for the server code, easily code-reviewable.

### features
  * browse through files/directories
  * upload with drag-and-drop
  * move/rename/delete files
  * browse through pictures with a full-screen carousel
  * stream videos directly from the browser
  * simple keyboard navigation/shortcuts
  * fast ; fills my 80MB/s AC wifi link

### built blobs
built blobs are available on the [release page](https://github.com/pldubouilh/gossa/releases).

### run
```sh
# build
make

# run
./gossa -h 192.168.100.33 ~/storage
```

### keyboard shortcuts
|shortcut | action|
|-------------|-------------|
|Arrows/Enter | browse through files/directories and pictures|
|Ctrl/Meta + C | copy URL to clipboard|
|Ctrl/Meta + B | toggle theme (dark/clear)|
|\<any letter\> | search|
|Ctrl/Meta + E | rename file/folder|
|Ctrl/Meta + Del | delete file/folder|
|Ctrl/Meta + D | create a new directory|
|Ctrl/Meta + X | cut selected path|
|Ctrl/Meta + V | paste previously selected paths to directory|

### ui shortcuts
|shortcut | action|
| ------------- |-------------|
|click new folder icon | create new folder|
|click images icon | toggle image carousel|
|click file icon  | rename item|
|double click file icon | delete item|
|drag-and-drop item on UI | move item|
|drag-and-drop external item | upload file/folders|

### using with docker
multiple dockerfiles are provided in the `docker` folder. to simply get started just have a look below


```sh
# build
cd docker
docker build -t gossa -f download .

# run
sudo docker run -v ~/LocalDirToShare:/shared -p 8001:8001 gossa
```
