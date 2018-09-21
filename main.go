package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"html"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func check(e error) {
	if e != nil {
		panic(e)
	}
}

var fs http.Handler

var host = flag.String("h", "127.0.0.1", "host to listen to")
var port = flag.String("p", "8001", "port to listen to")
var verb = flag.Bool("verb", true, "verbosity")
var skipHidden = flag.Bool("k", true, "skip hidden files")

var initPath = ""
var css = `css_will_be_here`  // js will be embedded here
var jsTag = `js_will_be_here` // id.
var units = [8]string{"k", "M", "G", "T", "P", "E", "Z", "Y"}
var favicon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAGFBMVEUAAACAgIDAwMAAAAD//////wAAAP+AgACyGYBKAAAAAXRSTlMAQObYZgAAAAFiS0dEBI9o2VEAAAAHdElNRQfiBhgXAzXpQrjsAAAArklEQVQoz3WQQQ7CIBBF4QbS4gEsYV8DHkAc3Rev0Buw8PoOQ9KZjPGlm76+hE+N+cdJvdughC+r+OqcAxCJB8CHE1vqBiASH6OHFycj2NEE50g8KdgxybBSMQI0oTYqKOim3EjcR9BNQGGnhSmJVh08PG45R+aScctUmS3jXFlEXdRroKHMnOgqzNxUQcNk8W7jd/CQ1IUcklSx6KImo45pRh1D4iPowiTBan74AnnnVMHA9EjhAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE4LTA2LTI0VDIzOjAzOjUzLTA0OjAwyUvdTwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxOC0wNi0yNFQyMzowMzo1My0wNDowMLgWZfMAAAAASUVORK5CYII="

type rpcCall struct {
	Call string   `json:"call"`
	Args []string `json:"args"`
}

func logVerb(s ...interface{}) {
	if *verb {
		log.Println(s)
	}
}

func sizeToString(bytes float64) string {
	if bytes == 0 {
		return "0"
	}
	var u = -1
	for {
		bytes = bytes / 1024
		u++
		if bytes < 1024 {
			break
		}
	}

	return strconv.FormatFloat(bytes, 'f', 1, 64) + units[u]
}

func row(name string, href string, size float64, ext string) string {
	if strings.HasPrefix(href, "/") {
		href = strings.Replace(href, "/", "", 1)
	}

	return `<tr>
				<td><i class="btn icon icon-` + strings.ToLower(ext) + ` icon-blank"></i></td>
				<td class="file-size"><code>` + sizeToString(size) + `</code></td>
				<td class="arrow"><i class="arrow-icon"></i></td>
				<td class="display-name"><a class="list-links" onclick="return onClickLink(event)" href="` + url.PathEscape(href) + `">` + name + `</a></td>
			</tr>`
}

func extraFolder(loc string) string {
	if !strings.HasSuffix(loc, "/") {
		loc = loc + "/"
	}
	if !strings.HasPrefix(loc, "/") {
		loc = "/" + loc
	}
	return `<a class="ic fav icon-large-folder" onclick="return onClickLink(event)" href="` + loc + `">` + loc + `</a>`
}

func replyList(w http.ResponseWriter, path string) {
	if !strings.HasSuffix(path, "/") {
		path += "/"
	}

	var head = `<!doctype html><html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width">
	  <title>` + html.EscapeString(path) + `</title>
	  <link href="` + favicon + `" rel="icon" type="image/png"/>
      <script>window.onload = function(){` + jsTag + `}</script>
      <style type="text/css">` + css + `</style>
    </head>
	<body>
      <div id="drop-grid"> Drop here to upload </div>
      <h1>.` + html.EscapeString(path) + `</h1>
	  <div class="icHolder"><div style="display:none;" class="ic icon-large-images" onclick="window.picsToggle()"></div>
	  <div class="ic icon-large-folder" onclick="window.mkdirBtn()"></div>` + extraFolder("/hols/aaa") + `</div>
      <div id="pics" style="display:none;"> <div onclick="window.picsToggle()" id="picsToggleCinema"></div> <img  onclick="window.picsNav()" id="picsHolder"/> <span id="picsLabel"></span> </div>
	  <table>`

	_files, err := ioutil.ReadDir(initPath + path)
	check(err)

	if path != "/" {
		head += row("../", "../", 0, "folder")
	}

	var dirs = ""
	var files = ""

	for _, el := range _files {
		var name = el.Name()
		if *skipHidden && strings.HasPrefix(name, ".") {
			continue
		}

		if el.IsDir() {
			dirs += row(name+"/", name, 0, "folder")
		} else {
			var sl = strings.Split(name, ".")
			var ext = sl[len(sl)-1]
			files += row(name, name, float64(el.Size()), ext)
		}
	}

	w.Write([]byte(head + dirs + files + `</table>
		<br><address><a href="https://github.com/pldubouilh/gossa">Gossa  🎶</a></address>
		<div id="progress" style="display:none;"><span id="dlBarName"></span><div id="dlBarPc">1%</div></div>
	</body></html>`))
}

func doContent(w http.ResponseWriter, r *http.Request) {
	path := html.UnescapeString(r.URL.Path)
	fullPath, errPath := checkPath(path)
	stat, errStat := os.Stat(fullPath)

	if errStat != nil || errPath != nil {
		logVerb("Error", errStat, errPath)
		w.Write([]byte("error"))
		return
	}

	if stat.IsDir() {
		logVerb("Get list", fullPath)
		replyList(w, path)
	} else {
		logVerb("Get file", fullPath)
		fs.ServeHTTP(w, r)
	}
}

func upload(w http.ResponseWriter, r *http.Request) {
	unescaped, _ := url.PathUnescape(r.Header.Get("gossa-path"))
	fullPath, err := checkPath(unescaped)

	logVerb("Up", err, fullPath)
	if err != nil {
		w.Write([]byte("error"))
		return
	}

	reader, _ := r.MultipartReader()
	part, _ := reader.NextPart()
	dst, _ := os.Create(fullPath)
	io.Copy(dst, part)
	logVerb("Done upping", fullPath)
	w.Write([]byte("ok"))
}

func rpc(w http.ResponseWriter, r *http.Request) {
	var err error
	bodyBytes, _ := ioutil.ReadAll(r.Body)
	bodyString := string(bodyBytes)
	var payload rpcCall
	json.Unmarshal([]byte(bodyString), &payload)

	for i := range payload.Args {
		payload.Args[i], err = checkPath(payload.Args[i])
		if err != nil {
			logVerb("Cant read path", err, payload)
			w.Write([]byte("error"))
			return
		}
	}

	if payload.Call == "mkdirp" {
		err = os.MkdirAll(payload.Args[0], os.ModePerm)
	} else if payload.Call == "mv" {
		err = os.Rename(payload.Args[0], payload.Args[1])
	}

	logVerb("RPC", err, payload)
	w.Write([]byte("ok"))
}

func checkPath(p string) (string, error) {
	p = filepath.Join(initPath, p)
	fp, err := filepath.Abs(p)

	if err != nil || !strings.HasPrefix(fp, initPath) {
		return "", errors.New("error")
	}

	return fp, nil
}

func main() {
	flag.Parse()

	if len(flag.Args()) == 0 {
		initPath = "."
	} else {
		initPath = flag.Args()[0]
	}

	var err error
	initPath, err = filepath.Abs(initPath)
	check(err)

	var hostString = *host + ":" + *port
	fmt.Println("Gossa startig on directory " + initPath)
	fmt.Println("Listening on http://" + hostString)

	var root = http.Dir(initPath)
	fs = http.StripPrefix("/", http.FileServer(root))

	http.HandleFunc("/rpc", rpc)
	http.HandleFunc("/post", upload)
	http.HandleFunc("/", doContent)
	err = http.ListenAndServe(hostString, nil)
	check(err)
}
