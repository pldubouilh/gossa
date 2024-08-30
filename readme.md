gossa
=============

![e](https://user-images.githubusercontent.com/760637/71449335-790a4200-274a-11ea-80be-4c536fbad8a1.gif)

[![build status](https://github.com/pldubouilh/gossa/workflows/ci/badge.svg)](https://github.com/pldubouilh/gossa/actions)
[![docker pulls](https://img.shields.io/docker/pulls/pldubouilh/gossa.svg?logo=docker)](https://hub.docker.com/r/pldubouilh/gossa)
[![github downloads](https://img.shields.io/github/downloads/pldubouilh/gossa/total.svg?logo=github)](https://github.com/pldubouilh/gossa/releases)

a fast and simple webserver for your files, that's dependency-free and with under 250 lines of code, easy to review.

a simple UI comes as default, featuring :

  * 🔍 files/directories browser & handler
  * 📩 drag-and-drop uploader
  * 💾 90s web UI that prints in milliseconds
  * 📸 video streaming, picture browser, pdf viewer
  * ✍️ simple note editor
  * ⌨️ keyboard navigation
  * 🚀 lightweight and dependency free codebase
  * 🔒 >95% test coverage and reproducible builds
  * 🥂 fast golang static server
  * 💑 easy multi account setup, read-only mode
  * ✨ PWA-able
  * 🖥️ multi-platform support

### install / build
[arch linux (AUR)](https://aur.archlinux.org/packages/gossa/) - e.g. `yay -S gossa`

[nix](https://search.nixos.org/packages?channel=unstable&show=gossa&from=0&size=50&sort=relevance&type=packages&query=gossa) - e.g. `nix-shell -p gossa`

[mpr](https://mpr.makedeb.org/packages/gossa)

binaries are available on the [release page](https://github.com/pldubouilh/gossa/releases)

all builds are reproducible, checkout the hashes on the release page.

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
% mkdir ~/LocalDirToShare
% sudo docker run -v ~/LocalDirToShare:/shared -p 8001:8001 pldubouilh/gossa
```

in a do-one-thing-well mindset, HTTPS and authentication has been left to middlewares and proxies. [sample caddy configs](https://github.com/pldubouilh/gossa/blob/master/support/) are available to quickly setup multi users setups along with https.

automatic boot-time startup can be handled with a user systemd service - see [support](https://github.com/pldubouilh/gossa/tree/master/support)

