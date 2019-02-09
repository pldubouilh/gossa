<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="theme-color" content="#070909">
    <meta name="msapplication-navbutton-color" content="#070909">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="viewport" content="width=device-width">
    <title>{{.Title}}</title>
    <link href="data:image/png;base64,favicon_will_be_here" rel="icon" type="image/png" />
    <style type="text/css">css_will_be_here</style>
    <script>window.onload = function () { js_will_be_here }</script>
</head>

<body>
    <div style="display: none;" onclick="window.quitAll()" id="quitAll"><i style="display: none;" id="toast">cant reach server</i></div>
    <div style="display: none;" contenteditable="true" id="text-editor"></div>
    <div id="drop-grid"></div>
    <input type="file" id="clickupload" style="display:none"/>

    <h1>.{{.Title}}</h1>

    <div id="icHolder">
        <div style="display:none;" onclick="document.getElementById('clickupload').click()" class="ic icon-large-upload manualUp"></div>
        <div onclick="window.displayPad()" class="ic icon-large-pad"></div>
        <div class="ic icon-large-folder" onclick="window.mkdirBtn()"></div>
    </div>

    <div id="pics" style="display:none;"> <img onclick="window.picsNav()" id="picsHolder" /></div>

    <table>
    {{range .RowsFolders}}
        <tr>
            <td class="iconRow"><i ondblclick="return rm(event)" onclick="return rename(event)" class="btn icon icon-{{.Ext}} icon-blank"></i></td>
            <td class="file-size"><code>{{.Size}}</code></td>
            <td class="arrow"><div class="arrow-icon"></div></td>
            <td class="display-name"><a class="list-links" onclick="return onClickLink(event)" href="{{.Href}}">{{.Name}}</a></td>
        </tr>
    {{end}}
    {{range .RowsFiles}}
        <tr>
            <td class="iconRow"><i ondblclick="return rm(event)" onclick="return rename(event)" class="btn icon icon-{{.Ext}} icon-blank"></i></td>
            <td class="file-size"><code>{{.Size}}</code></td>
            <td class="arrow"><div class="arrow-icon"></div></td>
            <td class="display-name"><a class="list-links" onclick="return onClickLink(event)" href="{{.Href}}">{{.Name}}</a></td>
        </tr>
    {{end}}
    </table>
</body>
<div id="progress" style="display:none;">
    <span id="dlBarName"></span>
    <div id="dlBarPc">1%</div>
</div>
<div id="ok" class="notif icon-large-ok"></div>
<div id="sad" class="notif icon-large-sad-server"></div>
</html>