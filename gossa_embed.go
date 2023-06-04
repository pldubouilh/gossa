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
var template0 string

// fill in template
var template1 = strings.Replace(template0, "css_will_be_here", styleCss, 1)
var template2 = strings.Replace(template1, "js_will_be_here", scriptJs, 1)
var template3 = strings.Replace(template2, "favicon_will_be_here", base64.StdEncoding.EncodeToString(faviconSvg), 2)
var templateParsed, _ = template.New("").Parse(template3)
