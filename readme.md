gossa
=============

![e](https://user-images.githubusercontent.com/760637/71449335-790a4200-274a-11ea-80be-4c536fbad8a1.gif)

[![build status](https://github.com/pldubouilh/gossa/workflows/ci/badge.svg)](https://github.com/pldubouilh/gossa/actions)
[![docker build status](https://img.shields.io/docker/cloud/build/pldubouilh/gossa.svg?logo=docker)](https://hub.docker.com/r/pldubouilh/gossa)
[![docker pulls](https://img.shields.io/docker/pulls/pldubouilh/gossa.svg?logo=docker)](https://hub.docker.com/r/pldubouilh/gossa)
[![github downloads](https://img.shields.io/github/downloads/pldubouilh/gossa/total.svg?logo=github)](https://github.com/pldubouilh/gossa/releases)

a fast and simple webserver for your files, that's dependency-free and with under 250 lines of code, easy to review.

a [simple UI](https://github.com/pldubouilh/gossa-ui) comes as default, featuring :

  * 🔍 files/directories browser & handler
  * 📩 drag-and-drop uploader
  * 🚀 lightweight and dependency free
  * 💾 90s web UI that prints in ms
  * 📸 picture browser
  * 📽️ video streaming
  * ✍️ simple text editor
  * ⌨️ keyboard navigation
  * 🥂 fast golang static server
  * 🔒 easy/secure multi account setup, read-only mode
  * ✨ PWA enabled

### build
built blobs are available on the [release page](https://github.com/pldubouilh/gossa/releases) - or simply `make build` this repo.

arch linux users can also install through the [user repos](https://aur.archlinux.org/packages/gossa/) - e.g. `yay -S gossa`

### usage
```sh
% ./gossa --help

% ./gossa -h 192.168.100.33 ~/storage
```

### shortcuts
press `Ctrl/Cmd + h` to see all the UI/keyboard shortcuts.

### fancier setups
release images are pushed to [dockerhub](https://hub.docker.com/r/pldubouilh/gossa), e.g. :

```sh
# pull from dockerhub and run
% sudo docker run -v ~/LocalDirToShare:/shared -p 8001:8001 pldubouilh/gossa
```

in a do-one-thing-well mindset, HTTPS and authentication has been left to middlewares and proxies. [sample caddy configs](https://github.com/pldubouilh/gossa/blob/master/support/) are available to quickly setup multi users setups along with https.


