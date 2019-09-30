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
var extraPath = flag.String("prefix", "/", "url prefix at which gossa can be reached, e.g. /gossa/ (slashes of importance)")
var symlinks = flag.Bool("symlinks", false, "follow symlinks \033[4mWARNING\033[0m: symlinks will by nature allow to escape the defined path (default: false)")
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
	ExtraPath   template.HTML
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

func exitPath(w http.ResponseWriter, s ...interface{}) {
	if r := recover(); r != nil {
		log.Println("error", s, r)
		w.WriteHeader(500)
		w.Write([]byte("error"))
	} else if *verb {
		log.Println(s...)
	}
}

func humanize(bytes int64) string {
	b := float64(bytes)
	u := 0
	for {
		if b < 1024 {
			return strconv.FormatFloat(b, 'f', 1, 64) + [9]string{"B", "k", "M", "G", "T", "P", "E", "Z", "Y"}[u]
		}
		b = b / 1024
		u++
	}
}

func replyList(w http.ResponseWriter, fullPath string, path string) {
	_files, err := ioutil.ReadDir(fullPath)
	check(err)

	if !strings.HasSuffix(path, "/") {
		path += "/"
	}

	title := "/" + strings.TrimPrefix(path, *extraPath)
	p := pageTemplate{}
	if path != *extraPath {
		p.RowsFolders = append(p.RowsFolders, rowTemplate{"../", "../", "", "folder"})
	}
	p.ExtraPath = template.HTML(html.EscapeString(*extraPath))
	p.Title = template.HTML(html.EscapeString(title))

	for _, el := range _files {
		if *skipHidden && strings.HasPrefix(el.Name(), ".") {
			continue
		}
		el, _ = os.Stat(fullPath + "/" + el.Name())
		href := url.PathEscape(el.Name())
		if el.IsDir() && strings.HasPrefix(href, "/") {
			href = strings.Replace(href, "/", "", 1)
		}
		if el.IsDir() {
			p.RowsFolders = append(p.RowsFolders, rowTemplate{el.Name() + "/", template.HTML(href), "", "folder"})
		} else {
			sl := strings.Split(el.Name(), ".")
			ext := strings.ToLower(sl[len(sl)-1])
			p.RowsFiles = append(p.RowsFiles, rowTemplate{el.Name(), template.HTML(href), humanize(el.Size()), ext})
		}
	}

	page.Execute(w, p)
}

func doContent(w http.ResponseWriter, r *http.Request) {
	if !strings.HasPrefix(r.URL.Path, *extraPath) {
		http.Redirect(w, r, *extraPath, 302)
		return
	}

	path := html.UnescapeString(r.URL.Path)
	defer exitPath(w, "get content", path)
	fullPath := checkPath(path)
	stat, errStat := os.Stat(fullPath)
	check(errStat)

	if stat.IsDir() {
		replyList(w, fullPath, path)
	} else {
		fs.ServeHTTP(w, r)
	}
}

func upload(w http.ResponseWriter, r *http.Request) {
	path, _ := url.PathUnescape(r.Header.Get("gossa-path"))
	defer exitPath(w, "upload", path)
	reader, _ := r.MultipartReader()
	part, _ := reader.NextPart()
	dst, _ := os.Create(checkPath(path))
	io.Copy(dst, part)
	w.Write([]byte("ok"))
}

func rpc(w http.ResponseWriter, r *http.Request) {
	var err error
	var rpc rpcCall
	bodyBytes, _ := ioutil.ReadAll(r.Body)
	json.Unmarshal(bodyBytes, &rpc)
	defer exitPath(w, "rpc", rpc)

	if rpc.Call == "mkdirp" {
		err = os.MkdirAll(checkPath(rpc.Args[0]), os.ModePerm)
	} else if rpc.Call == "mv" {
		err = os.Rename(checkPath(rpc.Args[0]), checkPath(rpc.Args[1]))
	} else if rpc.Call == "rm" {
		err = os.RemoveAll(checkPath(rpc.Args[0]))
	}

	check(err)
	w.Write([]byte("ok"))
}

func checkPath(p string) string {
	p = filepath.Join(initPath, strings.TrimPrefix(p, *extraPath))
	fp, err := filepath.Abs(p)
	sl, _ := filepath.EvalSymlinks(fp)

	if err != nil || !strings.HasPrefix(fp, initPath) || len(sl) > 0 && !*symlinks && !strings.HasPrefix(sl, initPath) {
		panic(errors.New("invalid path"))
	}

	return fp
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
	fmt.Println("Listening on http://" + hostString + *extraPath)

	http.HandleFunc(*extraPath+"rpc", rpc)
	http.HandleFunc(*extraPath+"post", upload)
	http.HandleFunc("/", doContent)
	fs = http.StripPrefix(*extraPath, http.FileServer(http.Dir(initPath)))
	err = http.ListenAndServe(hostString, nil)
	check(err)
}
