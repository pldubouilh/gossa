package main

import (
	"archive/zip"
	"compress/gzip"
	"crypto/md5"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"hash"
	"html"
	"html/template"
	"io"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

type rowTemplate struct {
	Name string
	Href template.URL
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

var host = flag.String("h", "127.0.0.1", "host to listen to")
var port = flag.String("p", "8001", "port to listen to")
var extraPath = flag.String("prefix", "/", "url prefix at which gossa can be reached, e.g. /gossa/ (slashes of importance)")
var symlinks = flag.Bool("symlinks", false, "follow symlinks \033[4mWARNING\033[0m: symlinks will by nature allow to escape the defined path (default: false)")
var verb = flag.Bool("verb", false, "verbosity")
var skipHidden = flag.Bool("k", true, "\nskip hidden files")
var ro = flag.Bool("ro", false, "read only mode (no upload, rename, move, etc...)")

type rpcCall struct {
	Call string   `json:"call"`
	Args []string `json:"args"`
}

var rootPath = ""
var handler http.Handler

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
	files, err := os.ReadDir(fullPath)
	check(err)
	sort.Slice(files, func(i, j int) bool { return strings.ToLower(files[i].Name()) < strings.ToLower(files[j].Name()) })

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

	for _, el := range files {
		info, err := el.Info()
		if err != nil {
			log.Println("error - cant stat a file", err)
			continue
		}

		if *skipHidden && strings.HasPrefix(el.Name(), ".") {
			continue // dont print hidden files if we're not allowed
		}
		if *symlinks && info.Mode()&os.ModeSymlink != 0 {
			continue // dont follow symlinks if we're not allowed
		}

		href := url.PathEscape(el.Name())
		name := el.Name()

		if el.IsDir() && strings.HasPrefix(href, "/") {
			href = strings.Replace(href, "/", "", 1)
		}

		if el.IsDir() {
			row := rowTemplate{name + "/", template.URL(href), "", "folder"}
			p.RowsFolders = append(p.RowsFolders, row)
		} else {
			sl := strings.Split(name, ".")
			ext := strings.ToLower(sl[len(sl)-1])
			row := rowTemplate{name, template.URL(href), humanize(info.Size()), ext}
			p.RowsFiles = append(p.RowsFiles, row)
		}
	}

	if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
		w.Header().Set("Content-Type", "text/html")
		w.Header().Add("Content-Encoding", "gzip")
		gz, err := gzip.NewWriterLevel(w, gzip.BestSpeed) // BestSpeed is Much Faster than default - base on a very unscientific local test, and only ~30% larger (compression remains still very effective, ~6x)
		check(err)
		defer gz.Close()
		tmpl.Execute(gz, p)
	} else {
		tmpl.Execute(w, p)
	}
}

func doContent(w http.ResponseWriter, r *http.Request) {
	if !strings.HasPrefix(r.URL.Path, *extraPath) { // redir when were not hitting the supplementary path if one is set
		http.Redirect(w, r, *extraPath, http.StatusFound)
		return
	}

	path := html.UnescapeString(r.URL.Path)
	defer exitPath(w, "get content", path)
	fullPath := enforcePath(path)
	stat, errStat := os.Stat(fullPath)
	check(errStat)

	if stat.IsDir() {
		replyList(w, r, fullPath, path)
	} else {
		handler.ServeHTTP(w, r)
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
		check(err)
	}
	dst, err := os.Create(enforcePath(path))
	check(err)
	io.Copy(dst, part)
	w.Write([]byte("ok"))
}

func zipRPC(w http.ResponseWriter, r *http.Request) {
	zipPath := r.URL.Query().Get("zipPath")
	zipName := r.URL.Query().Get("zipName")
	defer exitPath(w, "zip", zipPath)
	zipFullPath := enforcePath(zipPath)
	_, err := os.Lstat(zipFullPath)
	check(err)
	w.Header().Add("Content-Disposition", "attachment; filename=\""+zipName+".zip\"")
	zipWriter := zip.NewWriter(w)
	defer zipWriter.Close()

	err = filepath.Walk(zipFullPath, func(path string, f fs.FileInfo, err error) error {
		check(err)
		if f.IsDir() {
			return nil
		}

		rel, err := filepath.Rel(zipFullPath, path)
		check(err)
		if *skipHidden && (strings.HasPrefix(rel, ".") || strings.HasPrefix(f.Name(), ".")) {
			return nil // hidden files not allowed
		}
		if f.Mode()&os.ModeSymlink != 0 {
			panic(errors.New("symlink not allowed in zip downloads")) // filepath.Walk doesnt support symlinks
		}

		header, err := zip.FileInfoHeader(f)
		check(err)
		header.Name = filepath.ToSlash(rel) // make the paths consistent between OSes
		header.Method = zip.Store
		headerWriter, err := zipWriter.CreateHeader(header)
		check(err)
		file, err := os.Open(path)
		check(err)
		defer file.Close()
		_, err = io.Copy(headerWriter, file)
		check(err)
		return nil
	})

	check(err)
}

func rpc(w http.ResponseWriter, r *http.Request) {
	var err error
	var rpc rpcCall
	defer exitPath(w, "rpc", rpc)
	bodyBytes, err := io.ReadAll(r.Body)
	check(err)
	json.Unmarshal(bodyBytes, &rpc)

	switch rpc.Call {
	case "mkdirp":
		err = os.MkdirAll(enforcePath(rpc.Args[0]), os.ModePerm)
	case "mv":
		err = os.Rename(enforcePath(rpc.Args[0]), enforcePath(rpc.Args[1]))
	case "rm":
		err = os.RemoveAll(enforcePath(rpc.Args[0]))
	case "sum":
		var file *os.File
		enforcedPath := enforcePath(rpc.Args[0])
		file, err = os.Open(enforcedPath)
		var hash hash.Hash
		switch rpc.Args[1] {
		case "md5":
			hash = md5.New()
		case "sha1":
			hash = sha1.New()
		case "sha256":
			hash = sha256.New()
		case "sha512":
			hash = sha512.New()
		}
		_, err = io.Copy(hash, file)
		check(err)
		checksum := hash.Sum(nil)
		checksumHex := make([]byte, hex.EncodedLen(len(checksum)))
		hex.Encode(checksumHex, checksum)
		w.Write(checksumHex)
		return
	}

	check(err)
	w.Write([]byte("ok"))
}

func enforcePath(p string) string {
	joined := filepath.Join(rootPath, strings.TrimPrefix(p, *extraPath))
	fp, err := filepath.Abs(joined)
	sl, _ := filepath.EvalSymlinks(fp) // err skipped as it would error for unexistent files (RPC check). The actual behaviour is tested below

	// panic if we had a error getting absolute path,
	// ... or if path doesnt contain the prefix path we expect,
	// ... or if we're skipping hidden folders, and one is requested,
	// ... or if we're skipping symlinks, path exists, and a symlink out of bound requested
	if err != nil || !strings.HasPrefix(fp, rootPath) || *skipHidden && strings.Contains(p, "/.") || !*symlinks && len(sl) > 0 && !strings.HasPrefix(sl, rootPath) {
		panic(errors.New("invalid path"))
	}

	return fp
}

func main() {
	if flag.Parse(); len(flag.Args()) == 1 {
		rootPath = flag.Args()[0]
	} else {
		fmt.Printf("\nusage: ./gossa [OPTIONS] ~/directory-to-share\n\n")
		flag.PrintDefaults()
		os.Exit(1)
	}

	var err error
	rootPath, err = filepath.Abs(rootPath)
	check(err)
	server := &http.Server{Addr: *host + ":" + *port, Handler: handler}

	if !*ro {
		http.HandleFunc(*extraPath+"rpc", rpc)
		http.HandleFunc(*extraPath+"post", upload)
	}
	http.HandleFunc(*extraPath+"zip", zipRPC)
	http.HandleFunc("/", doContent)
	handler = http.StripPrefix(*extraPath, http.FileServer(http.Dir(rootPath)))

	fmt.Printf("Gossa starting on directory %s\n", rootPath)
	fmt.Printf("Verbose: %t, Symlinks: %t, Read-Only: %t, Hidden-Files Skipped: %t\n", *verb, *symlinks, *ro, *skipHidden)
	fmt.Printf("Listening on http://%s:%s%s\n", *host, *port, *extraPath)
	if err = server.ListenAndServe(); err != http.ErrServerClosed {
		check(err)
	}
}
