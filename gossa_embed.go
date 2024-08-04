package main

import (
	_ "embed"
	"encoding/base64"
	"html/template"
	"strings"
)

//go:embed ui/script.js
var scriptJs string

//go:embed ui/style.css
var styleCss string

//go:embed ui/favicon.svg
var faviconSvg []byte

//go:embed ui/ui.tmpl
var uiTmpl string

var tmpl *template.Template

// fill in template
func init() {
	var err error
	t := strings.Replace(uiTmpl, "css_will_be_here", styleCss, 1)
	t = strings.Replace(t, "js_will_be_here", scriptJs, 1)
	t = strings.Replace(t, "favicon_will_be_here", base64.StdEncoding.EncodeToString(faviconSvg), 2)
	tmpl, err = template.New("").Parse(t)
	if err != nil {
		panic(err)
	}
}
