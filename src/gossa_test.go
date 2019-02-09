package main

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"
	"regexp"
	"strings"
	"testing"
)

func dieMaybe(t *testing.T, err error) {
	if err != nil {
		t.Fatal(err)
	}
}

func trimSpaces(str string) string {
	space := regexp.MustCompile(`\s+`)
	return space.ReplaceAllString(str, " ")
}

func get(t *testing.T, url string) string {
	resp, err := http.Get(url)
	dieMaybe(t, err)
	body, err := ioutil.ReadAll(resp.Body)
	dieMaybe(t, err)
	return trimSpaces(string(body))
}

func postDummyFile(t *testing.T, path string, payload string) string {
	// Generated by curl-to-Go: https://mholt.github.io/curl-to-go
	body := strings.NewReader("------WebKitFormBoundarycCRIderiXxJWEUcU\r\nContent-Disposition: form-data; name=\"\u1112\u1161 \u1112\u1161\"; filename=\"\u1112\u1161 \u1112\u1161\"\r\nContent-Type: application/octet-stream\r\n\r\n" + payload)
	req, err := http.NewRequest("POST", "http://127.0.0.1:8001/post", body)
	dieMaybe(t, err)
	req.Header.Set("Content-Type", "multipart/form-data; boundary=----WebKitFormBoundarycCRIderiXxJWEUcU")
	req.Header.Set("Gossa-Path", path)

	resp, err := http.DefaultClient.Do(req)
	dieMaybe(t, err)
	defer resp.Body.Close()
	bodyS, err := ioutil.ReadAll(resp.Body)
	dieMaybe(t, err)
	return trimSpaces(string(bodyS))
}

func postJSON(t *testing.T, url string, what string) string {
	resp, err := http.Post(url, "application/json", bytes.NewBuffer([]byte(what)))
	dieMaybe(t, err)
	body, err := ioutil.ReadAll(resp.Body)
	dieMaybe(t, err)
	return trimSpaces(string(body))

}

func testDefaults(t *testing.T, url string) string {
	bodyStr := get(t, url)

	if !strings.Contains(bodyStr, `<title>/</title>`) {
		t.Fatal("error title")
	}

	if !strings.Contains(bodyStr, `<h1>./</h1>`) {
		t.Fatal("error header")
	}

	if !strings.Contains(bodyStr, `href="hols">hols/</a>`) {
		t.Fatal("error hols folder")
	}

	if !strings.Contains(bodyStr, `href="curimit@gmail.com%20%2840%25%29">curimit@gmail.com (40%)/</a>`) {
		t.Fatal("error curimit@gmail.com (40%) folder")
	}

	if !strings.Contains(bodyStr, `href="%E4%B8%AD%E6%96%87">中文/</a>`) {
		t.Fatal("error 中文 folder")
	}

	if !strings.Contains(bodyStr, `<tr> <td class="iconRow"><i ondblclick="return rm(event)" onclick="return rename(event)" class="btn icon icon-types icon-blank"></i></td> <td class="file-size"><code>211.0B</code></td> <td class="arrow"><div class="arrow-icon"></div></td> <td class="display-name"><a class="list-links" onclick="return onClickLink(event)" href="custom_mime_type.types">custom_mime_type.types</a></td> </tr>`) {
		t.Fatal("error row custom_mime_type")
	}

	return bodyStr
}

func TestGetFolder(t *testing.T) {
	payload := ""
	path := ""

	// ~~~~~~~~~~~~~~~~~
	fmt.Println("\r\n~~~~~~~~~~ test fetching default path")
	testDefaults(t, "http://127.0.0.1:8001/")

	// ~~~~~~~~~~~~~~~~~
	fmt.Println("\r\n~~~~~~~~~~ test fetching an invalid path - redirected to root")
	testDefaults(t, "http://127.0.0.1:8001/../../")
	testDefaults(t, "http://127.0.0.1:8001/hols/../../")

	// ~~~~~~~~~~~~~~~~~
	fmt.Println("\r\n~~~~~~~~~~ test fetching a regular file")
	bodyStr := get(t, "http://127.0.0.1:8001/subdir_with%20space/file_with%20space.html")
	if !strings.Contains(bodyStr, `<b>spacious!!</b>`) {
		t.Fatal("fetching a regular file errored")
	}

	// ~~~~~~~~~~~~~~~~~
	fmt.Println("\r\n~~~~~~~~~~ test fetching a invalid file")
	bodyStr = get(t, "http://127.0.0.1:8001/../../../../../../../../../../etc/passwd")
	if !strings.Contains(bodyStr, `error`) {
		t.Fatal("fetching a invalid file didnt errored")
	}

	// ~~~~~~~~~~~~~~~~~
	fmt.Println("\r\n~~~~~~~~~~ test mkdir rpc")
	bodyStr = postJSON(t, "http://127.0.0.1:8001/rpc", `{"call":"mkdirp","args":["/AAA"]}`)
	if !strings.Contains(bodyStr, `ok`) {
		t.Fatal("mkdir rpc errored")
	}

	bodyStr = testDefaults(t, "http://127.0.0.1:8001/")
	if !strings.Contains(bodyStr, `<tr> <td class="iconRow"><i ondblclick="return rm(event)" onclick="return rename(event)" class="btn icon icon-folder icon-blank"></i></td> <td class="file-size"><code></code></td> <td class="arrow"><div class="arrow-icon"></div></td> <td class="display-name"><a class="list-links" onclick="return onClickLink(event)" href="AAA">AAA/</a></td> </tr>`) {
		t.Fatal("mkdir rpc folder not created")
	}

	// ~~~~~~~~~~~~~~~~~
	fmt.Println("\r\n~~~~~~~~~~ test invalid mkdir rpc")
	bodyStr = postJSON(t, "http://127.0.0.1:8001/rpc", `{"call":"mkdirp","args":["../BBB"]}`)
	if !strings.Contains(bodyStr, `error`) {
		t.Fatal("invalid mkdir rpc didnt errored #0")
	}

	bodyStr = postJSON(t, "http://127.0.0.1:8001/rpc", `{"call":"mkdirp","args":["/../BBB"]}`)
	if !strings.Contains(bodyStr, `error`) {
		t.Fatal("invalid mkdir rpc didnt errored #1")
	}

	// ~~~~~~~~~~~~~~~~~
	fmt.Println("\r\n~~~~~~~~~~ test post file")
	path = "%E1%84%92%E1%85%A1%20%E1%84%92%E1%85%A1" // "하 하" encoded
	payload = "12 하"
	bodyStr = postDummyFile(t, "%2F"+path, payload)
	if !strings.Contains(bodyStr, `ok`) {
		t.Fatal("post file errored")
	}

	bodyStr = get(t, "http://127.0.0.1:8001/"+path)
	if !strings.Contains(bodyStr, payload) {
		t.Fatal("post file errored reaching new file")
	}

	bodyStr = testDefaults(t, "http://127.0.0.1:8001/")
	if !strings.Contains(bodyStr, `<tr> <td class="iconRow"><i ondblclick="return rm(event)" onclick="return rename(event)" class="btn icon icon-하 하 icon-blank"></i></td> <td class="file-size"><code>9.0B</code></td> <td class="arrow"><div class="arrow-icon"></div></td> <td class="display-name"><a class="list-links" onclick="return onClickLink(event)" href="%E1%84%92%E1%85%A1%20%E1%84%92%E1%85%A1">하 하</a></td> </tr>`) {
		t.Fatal("post file errored checking new file row")
	}

	// ~~~~~~~~~~~~~~~~~
	fmt.Println("\r\n~~~~~~~~~~ test post file incorrect path")
	bodyStr = postDummyFile(t, "%2E%2E%2F"+path, payload)
	if !strings.Contains(bodyStr, `err`) {
		t.Fatal("post file incorrect path didnt errored")
	}

	// ~~~~~~~~~~~~~~~~~
	fmt.Println("\r\n~~~~~~~~~~ test mv rpc")
	bodyStr = postJSON(t, "http://127.0.0.1:8001/rpc", `{"call":"mv","args":["/AAA", "/hols/AAA"]}`)
	if !strings.Contains(bodyStr, `ok`) {
		t.Fatal("mv rpc errored")
	}

	bodyStr = testDefaults(t, "http://127.0.0.1:8001/")
	if strings.Contains(bodyStr, `<tr> <td><i ondblclick="return rm(event)" onclick="return rename(event)" class="btn icon icon-folder icon-blank"></i></td> <td class="file-size"><code></code></td> <td class="arrow"><i class="arrow-icon"></i></td> <td class="display-name"><a class="list-links" onclick="return onClickLink(event)" href="AAA">AAA/</a></td> </tr>`) {
		t.Fatal("mv rpc folder not moved")
	}

	// ~~~~~~~~~~~~~~~~~
	fmt.Println("\r\n~~~~~~~~~~ test upload in new folder")
	payload = "abcdef1234"
	bodyStr = postDummyFile(t, "%2Fhols%2FAAA%2Fabcdef", payload)
	if strings.Contains(bodyStr, `err`) {
		t.Fatal("upload in new folder errored")
	}

	bodyStr = get(t, "http://127.0.0.1:8001/hols/AAA/abcdef")
	if !strings.Contains(bodyStr, payload) {
		t.Fatal("upload in new folder error reaching new file")
	}

	// ~~~~~~~~~~~~~~~~~
	fmt.Println("\r\n~~~~~~~~~~ test rm rpc & cleanup")
	bodyStr = postJSON(t, "http://127.0.0.1:8001/rpc", `{"call":"rm","args":["/hols/AAA"]}`)
	if !strings.Contains(bodyStr, `ok`) {
		t.Fatal("cleanup errored #0")
	}

	bodyStr = get(t, "http://127.0.0.1:8001/hols/AAA")
	if !strings.Contains(bodyStr, `error`) {
		t.Fatal("cleanup errored #1")
	}

	bodyStr = postJSON(t, "http://127.0.0.1:8001/rpc", `{"call":"rm","args":["/하 하"]}`)
	if !strings.Contains(bodyStr, `ok`) {
		t.Fatal("cleanup errored #2")
	}
}
