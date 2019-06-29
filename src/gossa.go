package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"html"
	"html/template"
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

var host = flag.String("h", "127.0.0.1", "host to listen to")
var port = flag.String("p", "8001", "port to listen to")
var verb = flag.Bool("verb", true, "verbosity")
var skipHidden = flag.Bool("k", true, "skip hidden files")
var initPath = "."

var fs http.Handler
var page, _ = template.New("pageTemplate").Parse(`template_will_be_here`)

type rowTemplate struct {
	Name string
	Href template.HTML
	Size string
	Ext  string
}

type pageTemplate struct {
	Title       template.HTML
	RowsFiles   []rowTemplate
	RowsFolders []rowTemplate
}

type rpcCall struct {
	Call string   `json:"call"`
	Args []string `json:"args"`
}

func check(e error) {
	if e != nil {
		panic(e)
	}
}

func logVerb(s ...interface{}) {
	if *verb {
		log.Println(s...)
	}
}

func sizeToString(bytes int64) string {
	units := [9]string{"B", "k", "M", "G", "T", "P", "E", "Z", "Y"}
	b := float64(bytes)
	u := 0
	for {
		if b < 1024 {
			return strconv.FormatFloat(b, 'f', 1, 64) + units[u]
		}
		b = b / 1024
		u++
	}
}

func replyList(w http.ResponseWriter, path string) {
	if !strings.HasSuffix(path, "/") {
		path += "/"
	}

	_files, err := ioutil.ReadDir(initPath + path)
	check(err)

	p := pageTemplate{}
	if path != "/" {
		p.RowsFolders = append(p.RowsFolders, rowTemplate{"../", "../", "", "folder"})
	}

	for _, el := range _files {
		name := el.Name()
		href := url.PathEscape(name)
		if *skipHidden && strings.HasPrefix(name, ".") {
			continue
		}
		if el.IsDir() && strings.HasPrefix(href, "/") {
			href = strings.Replace(href, "/", "", 1)
		}
		if el.IsDir() {
			p.RowsFolders = append(p.RowsFolders, rowTemplate{name + "/", template.HTML(href), "", "folder"})
		} else {
			sl := strings.Split(name, ".")
			ext := strings.ToLower(sl[len(sl)-1])
			p.RowsFiles = append(p.RowsFiles, rowTemplate{name, template.HTML(href), sizeToString(el.Size()), ext})
		}
	}

	p.Title = template.HTML(html.EscapeString(path))
	page.Execute(w, p)
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
	} else if payload.Call == "rm" {
		err = os.RemoveAll(payload.Args[0])
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
	if len(flag.Args()) > 0 {
		initPath = flag.Args()[0]
	}

	var err error
	initPath, err = filepath.Abs(initPath)
	check(err)

	hostString := *host + ":" + *port
	fmt.Println("Gossa startig on directory " + initPath)
	fmt.Println("Listening on http://" + hostString)

	root := http.Dir(initPath)
	fs = http.StripPrefix("/", http.FileServer(root))

	http.HandleFunc("/rpc", rpc)
	http.HandleFunc("/post", upload)
	http.HandleFunc("/", doContent)
	err = http.ListenAndServe(hostString, nil)
	check(err)
}
