gossa
=============

![e](https://user-images.githubusercontent.com/760637/71449335-790a4200-274a-11ea-80be-4c536fbad8a1.gif)

[![build status](https://github.com/pldubouilh/gossa/workflows/ci/badge.svg)](https://github.com/pldubouilh/gossa/actions)
[![docker build status](https://img.shields.io/docker/cloud/build/pldubouilh/gossa.svg?logo=docker)](https://hub.docker.com/r/pldubouilh/gossa)
[![docker pulls](https://img.shields.io/docker/pulls/pldubouilh/gossa.svg?logo=docker)](https://hub.docker.com/r/pldubouilh/gossa)
[![github downloads](https://img.shields.io/github/downloads/pldubouilh/gossa/total.svg?logo=github)](https://github.com/pldubouilh/gossa/releases)

a fast and simple webserver for your files, that's dependency-free and with under 200 lines of code, easy to review.

a [simple UI](https://github.com/pldubouilh/gossa-ui) comes as default, featuring :

  * 🔍 files/directories browser
  * 📩 drag-and-drop file/directory uploader
  * 🚀 lightweight, default ui weights 110kB and prints in ms
  * 🗺️ files handling - move/rename/delete
  * 📸 picture browser
  * 📽️ video streaming
  * ✍️ simple text editor
  * ⌨️ keyboard shortcuts
  * 🥂 fast golang static server, easily fills available bandwidth
  * 🔒 easy/secure multi account setup

### build
built blobs are available on the [release page](https://github.com/pldubouilh/gossa/releases) - or simply `make build` this repo.

### usage
```sh
% ./gossa --help

% ./gossa -h 192.168.100.33 ~/storage
```

### fancier setups
release images are pushed to [dockerhub](https://hub.docker.com/r/pldubouilh/gossa), e.g. :

```sh
# pull from dockerhub and run
% sudo docker run -v ~/LocalDirToShare:/shared -p 8001:8001 pldubouilh/gossa
```

in a do-one-thing-well mindset, HTTPS and authentication has been left to middlewares and proxies. [sample caddy configs](https://github.com/pldubouilh/gossa/blob/master/support/) are available to quickly setup multi users setups along with https.

### shortcuts
the default UI is fully usable by through keyboard/UI shortcuts - press `Ctrl/Cmd + h` to see them all.

