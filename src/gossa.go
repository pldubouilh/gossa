package main

import (
	"crypto/sha256"
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
	"sync"
)

var host = flag.String("h", "127.0.0.1", "host to listen to")
var port = flag.String("p", "8001", "port to listen to")
var history = flag.Bool("history", true, "keep history for paths visited. default location is path/.gossa_history")
var extraPath = flag.String("prefix", "/", "url prefix at which gossa can be reached, e.g. /gossa/ (slashes of importance)")
var symlinks = flag.Bool("symlinks", false, "follow symlinks \033[4mWARNING\033[0m: symlinks will by nature allow to escape the defined path (default: false)")
var verb = flag.Bool("verb", false, "verbosity")
var skipHidden = flag.Bool("k", true, "skip hidden files")
var initPath = "."
var historyPath = ""
var state = make(map[string]string)
var stateLock = sync.RWMutex{}

var fs http.Handler
var page, _ = template.New("pageTemplate").Parse(`template_will_be_here`)

type rowTemplate struct {
	Name     string
	Href     template.HTML
	Size     string
	Ext      string
	Selected bool
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

func hash(s string) string {
	return fmt.Sprintf("%x", sha256.Sum256([]byte(s)))
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

func replyList(w http.ResponseWriter, r *http.Request, fullPath string, path string) {
	_files, err := ioutil.ReadDir(fullPath)
	check(err)
	if !strings.HasSuffix(path, "/") {
		path += "/"
	}

	title := "/" + strings.TrimPrefix(path, *extraPath)
	p := pageTemplate{}
	if path != *extraPath {
		p.RowsFolders = append(p.RowsFolders, rowTemplate{"../", "../", "", "folder", false})
	}
	p.ExtraPath = template.HTML(html.EscapeString(*extraPath))
	p.Title = template.HTML(html.EscapeString(title))
	stateLock.Lock()
	loc := state[hash(r.Header.Get("Authorization")+path)]
	stateLock.Unlock()

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
			p.RowsFolders = append(p.RowsFolders, rowTemplate{el.Name() + "/", template.HTML(href), "", "folder", loc == hash(el.Name()+"/")})
		} else {
			sl := strings.Split(el.Name(), ".")
			p.RowsFiles = append(p.RowsFiles, rowTemplate{el.Name(), template.HTML(href), humanize(el.Size()), strings.ToLower(sl[len(sl)-1]), loc == hash(el.Name())})
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
		replyList(w, r, fullPath, path)
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
	stateLock.Lock()
	defer stateLock.Unlock()
	ret := "ok"
	key := hash(r.Header.Get("Authorization") + rpc.Args[0])

	if rpc.Call == "mkdirp" {
		err = os.MkdirAll(checkPath(rpc.Args[0]), os.ModePerm)
	} else if rpc.Call == "mv" {
		err = os.Rename(checkPath(rpc.Args[0]), checkPath(rpc.Args[1]))
	} else if rpc.Call == "rm" {
		err = os.RemoveAll(checkPath(rpc.Args[0]))
	} else if rpc.Call == "historySet" && *history {
		if rpc.Args[2] == "hash" {
			state[key] = hash(rpc.Args[1])
		} else {
			state[key] = rpc.Args[1]
		}
		f, _ := json.MarshalIndent(state, "", " ")
		ioutil.WriteFile(historyPath, f, 0644)
	} else if rpc.Call == "historyGet" && *history {
		ret = state[key]
	}

	check(err)
	w.Write([]byte(ret))
}

func checkPath(p string) string {
	joined := filepath.Join(initPath, strings.TrimPrefix(p, *extraPath))
	fp, err := filepath.Abs(joined)
	sl, _ := filepath.EvalSymlinks(fp)

	if err != nil || !strings.HasPrefix(fp, initPath) || *skipHidden && strings.Contains(p, "/.") || !*symlinks && len(sl) > 0 && !strings.HasPrefix(sl, initPath) {
		panic(errors.New("invalid path"))
	}

	return fp
}

func main() {
	var err error
	flag.Usage = func() {
		fmt.Printf("\nusage: ./gossa ~/directory-to-share\n\n")
		flag.PrintDefaults()
	}
	flag.Parse()
	if len(flag.Args()) > 0 {
		initPath = flag.Args()[0]
	}

	historyPath = filepath.Join(initPath, ".gossa_history")
	h, _ := ioutil.ReadFile(historyPath)
	_ = json.Unmarshal(h, &state)
	initPath, err = filepath.Abs(initPath)
	check(err)

	http.HandleFunc(*extraPath+"rpc", rpc)
	http.HandleFunc(*extraPath+"post", upload)
	http.HandleFunc("/", doContent)
	fs = http.StripPrefix(*extraPath, http.FileServer(http.Dir(initPath)))
	fmt.Printf("Gossa startig on directory %s\nListening on http://%s:%s%s\n", initPath, *host, *port, *extraPath)
	err = http.ListenAndServe(*host+":"+*port, nil)
	check(err)
}
