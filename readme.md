gossa
=============

![e](https://user-images.githubusercontent.com/760637/71449335-790a4200-274a-11ea-80be-4c536fbad8a1.gif)

[![build status](https://github.com/pldubouilh/gossa/workflows/ci/badge.svg)](https://github.com/pldubouilh/gossa/actions)
[![docker pulls](https://img.shields.io/docker/pulls/pldubouilh/gossa.svg?logo=docker)](https://hub.docker.com/r/pldubouilh/gossa)
[![github downloads](https://img.shields.io/github/downloads/pldubouilh/gossa/total.svg?logo=github)](https://github.com/pldubouilh/gossa/releases)

a fast and simple webserver for your files, that's dependency-free and with under 250 lines of code, easy to review.

a [simple UI](https://github.com/pldubouilh/gossa-ui) comes as default, featuring :

  * 🔍 files/directories browser & handler
  * 📩 drag-and-drop uploader
  * 🥂 fast golang static server
  * 💾 90s web UI that prints in milliseconds
  * 📸 video streaming & picture browser
  * ✍️ simple note editor
  * ⌨️ keyboard navigation
  * 🚀 lightweight and dependency free codebase
  * 🔒 >95% test coverage and reproducible builds
  * 💑 easy multi account setup, read-only mode
  * ✨ PWA enabled

### build
built blobs are available on the [release page](https://github.com/pldubouilh/gossa/releases) - or simply `make build` this repo.
all builds are reproducible, checkout the hashes on the release page.

arch linux users can also install through the [user repos](https://aur.archlinux.org/packages/gossa/) - e.g. `yay -S gossa`

automatic boot-time startup can be handled with a user systemd service - see [support](https://github.com/pldubouilh/gossa/tree/master/support)

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


