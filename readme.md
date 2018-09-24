gossa
=============

![e](https://user-images.githubusercontent.com/760637/45410804-f2c00e80-b672-11e8-8c2b-51d7fc0915aa.gif)

[![Build Status](https://travis-ci.org/pldubouilh/gossa.svg?branch=master)](https://travis-ci.org/pldubouilh/gossa)

🎶 A fast and simple webserver for your files. It's dependency-free and with under 250 lines for the server code, easily code-reviewable.

### features
  * browse throughout files/directories
  * upload files and folders with drag-and-drop
  * create new folders
  * move files to different directories with drag-and-drop and keyboard
  * browse throughout pictures with a full-screen carousel
  * simple keyboard navigation/shortcuts
  * fast ; fills my 80MB/s AC wifi link

### run
```sh
# run on test fixture folder
make run

# build
make
./gossa --help

# run CI tests
make ci
```

### keyboard shortcuts
  * Arrows/Enter  browse throughout the files/directories and pictures
  * Ctrl/Meta + C  copy selected path to clipboard
  * Ctrl/Meta + D  create a new directory
  * Ctrl/Meta + X  cut selected path
  * Ctrl/Meta + V  paste paths previously selected with the above shortcut to directory
  * \<any letter\>  search on first letters in filename

### built blobs
built blobs are available on the [release page](https://github.com/pldubouilh/gossa/releases).
