package main

import (
	_ "embed"
	"encoding/base64"
	"flag"
	"html/template"
	"strings"
)

//go:embed gossa-ui/script.js
var scriptJs string

//go:embed gossa-ui/style.css
var styleCss string

//go:embed gossa-ui/favicon.svg
var faviconSvg []byte

//go:embed gossa-ui/ui.tmpl
var templateStr string

// fill in template
var templateCss = strings.Replace(templateStr, "css_will_be_here", styleCss, 1)
var templateCssJs = strings.Replace(templateCss, "js_will_be_here", scriptJs, 1)
var templateCssJssIcon = strings.Replace(templateCssJs, "favicon_will_be_here", base64.StdEncoding.EncodeToString(faviconSvg), 2)
var templateParsed, _ = template.New("").Parse(templateCssJssIcon)

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

var host = flag.String("h", "127.0.0.1", "host to listen to")
var port = flag.String("p", "8001", "port to listen to")
var extraPath = flag.String("prefix", "/", "url prefix at which gossa can be reached, e.g. /gossa/ (slashes of importance)")
var symlinks = flag.Bool("symlinks", false, "follow symlinks \033[4mWARNING\033[0m: symlinks will by nature allow to escape the defined path (default: false)")
var verb = flag.Bool("verb", false, "verbosity")
var skipHidden = flag.Bool("k", true, "\nskip hidden files")
var ro = flag.Bool("ro", false, "read only mode (no upload, rename, move, etc...)")
