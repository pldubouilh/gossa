package main

import (
	"archive/zip"
	"compress/gzip"
	_ "embed"
	"encoding/base64"
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
	"sort"
	"strconv"
	"strings"
)

var host = flag.String("h", "127.0.0.1", "host to listen to")
var port = flag.String("p", "8001", "port to listen to")
var extraPath = flag.String("prefix", "/", "url prefix at which gossa can be reached, e.g. /gossa/ (slashes of importance)")
var symlinks = flag.Bool("symlinks", false, "follow symlinks \033[4mWARNING\033[0m: symlinks will by nature allow to escape the defined path (default: false)")
var verb = flag.Bool("verb", false, "verbosity")
var skipHidden = flag.Bool("k", true, "\nskip hidden files")
var ro = flag.Bool("ro", false, "read only mode (no upload, rename, move, etc...)")
var initPath = "."

var fs http.Handler

//go:embed gossa-ui/ui.tmpl
var templateStr string
var templateParsed *template.Template

//go:embed gossa-ui/script.js
var scriptJs string

//go:embed gossa-ui/style.css
var styleCss string

//go:embed gossa-ui/favicon.svg
var faviconSvg []byte

type rowTemplate struct {
	Name string
	Href template.HTML
	Size string
	Ext  string
}

type pageTemplate struct {
	Title       template.HTML
	ExtraPath   template.HTML
	Ro          bool
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

func replyList(w http.ResponseWriter, r *http.Request, fullPath string, path string) {
	_files, err := ioutil.ReadDir(fullPath)
	check(err)
	sort.Slice(_files, func(i, j int) bool { return strings.ToLower(_files[i].Name()) < strings.ToLower(_files[j].Name()) })

	if !strings.HasSuffix(path, "/") {
		path += "/"
	}

	title := "/" + strings.TrimPrefix(path, *extraPath)
	p := pageTemplate{}
	if path != *extraPath {
		p.RowsFolders = append(p.RowsFolders, rowTemplate{"../", "../", "", "folder"})
	}
	p.ExtraPath = template.HTML(html.EscapeString(*extraPath))
	p.Ro = *ro
	p.Title = template.HTML(html.EscapeString(title))

	for _, el := range _files {
		if *skipHidden && strings.HasPrefix(el.Name(), ".") {
			continue
		}
		el, err := os.Stat(fullPath + "/" + el.Name())
		if err != nil {
			log.Println("error - cant stat a file", err)
			continue
		}

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

	if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
		w.Header().Set("Content-Type", "text/html")
		w.Header().Add("Content-Encoding", "gzip")
		gz, err := gzip.NewWriterLevel(w, gzip.BestSpeed) // BestSpeed is Much Faster than default - base on a very unscientific local test, and only ~30% larger (compression remains still very effective, ~6x)
		check(err)
		defer gz.Close()
		templateParsed.Execute(gz, p)
	} else {
		templateParsed.Execute(w, p)
	}
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
	path := r.Header.Get("gossa-path")
	defer exitPath(w, "upload", path)

	path, err := url.PathUnescape(path)
	check(err)
	reader, err := r.MultipartReader()
	check(err)
	part, err := reader.NextPart()
	if err != nil && err != io.EOF { // errs EOF when no more parts to process
		panic(err)
	}
	dst, err := os.Create(checkPath(path))
	check(err)
	io.Copy(dst, part)
	w.Write([]byte("ok"))
}

func walkZip(wz *zip.Writer, fp, baseInZip string) {
	files, err := ioutil.ReadDir(fp)
	check(err)

	for _, file := range files {
		if !file.IsDir() {
			data, err := ioutil.ReadFile(fp + file.Name())
			check(err)
			f, err := wz.Create(baseInZip + file.Name())
			check(err)
			_, err = f.Write(data)
			check(err)
		} else if file.IsDir() {
			newBase := fp + file.Name() + "/"
			walkZip(wz, newBase, baseInZip+file.Name()+"/")
		}
	}
}

func zipRPC(w http.ResponseWriter, r *http.Request) {
	zipPath := r.URL.Query().Get("zipPath")
	zipName := r.URL.Query().Get("zipName")
	defer exitPath(w, "zip", zipPath)
	wz := zip.NewWriter(w)
	w.Header().Add("Content-Disposition", "attachment; filename=\""+zipName+".zip\"")
	walkZip(wz, checkPath(zipPath)+"/", "")
	wz.Close()
}

func rpc(w http.ResponseWriter, r *http.Request) {
	var err error
	var rpc rpcCall
	defer exitPath(w, "rpc", rpc)
	bodyBytes, err := ioutil.ReadAll(r.Body)
	check(err)
	json.Unmarshal(bodyBytes, &rpc)

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
	joined := filepath.Join(initPath, strings.TrimPrefix(p, *extraPath))
	fp, err := filepath.Abs(joined)
	sl, _ := filepath.EvalSymlinks(fp) // err skipped as it would error if no symlink. The actual behaviour is tested below

	// panic if we had a error getting absolute path,
	// ... or if path doesnt contain the prefix path we expect,
	// ... or if we skipping hidden folders, and one is requested,
	// ... or if we enable symlinks - but it resolves out of our predefined path.
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

	initPath, err = filepath.Abs(initPath)
	check(err)

	templateStr = strings.Replace(templateStr, "css_will_be_here", styleCss, 1)
	templateStr = strings.Replace(templateStr, "js_will_be_here", scriptJs, 1)
	templateStr = strings.Replace(templateStr, "favicon_will_be_here", base64.StdEncoding.EncodeToString(faviconSvg), 2)
	templateParsed, err = template.New("").Parse(templateStr)
	check(err)

	if !*ro {
		http.HandleFunc(*extraPath+"rpc", rpc)
		http.HandleFunc(*extraPath+"post", upload)
	}

	http.HandleFunc(*extraPath+"zip", zipRPC)
	http.HandleFunc("/", doContent)
	fs = http.StripPrefix(*extraPath, http.FileServer(http.Dir(initPath)))
	fmt.Printf("Gossa starting on directory %s\nListening on http://%s:%s%s\n", initPath, *host, *port, *extraPath)
	err = http.ListenAndServe(*host+":"+*port, nil)
	check(err)
}
