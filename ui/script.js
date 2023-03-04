/* eslint-env browser */
/* eslint-disable no-multi-str */

function cancelDefault (e) {
  e.preventDefault()
  e.stopPropagation()
}

const warningMsg = () => 'Leaving will interrupt transfer?\n'
const rmMsg = () => !confirm('Remove file?\n')
const ensureMove = () => !confirm('move items?')
const isRo = () => window.ro

const upBarName = document.getElementById('upBarName')
const upBarPc = document.getElementById('upBarPc')
const upGrid = document.getElementById('drop-grid')
const pics = document.getElementById('pics')
const picsHolder = document.getElementById('picsHolder')
const video = document.getElementById('video')
const videoHolder = document.getElementById('videoHolder')
const manualUpload = document.getElementById('clickupload')
const help = document.getElementById('help')
const okBadge = document.getElementById('ok')
const sadBadge = document.getElementById('sad')
const pageTitle = document.head.querySelector('title')
const pageH1 = document.body.querySelector('h1')
const editor = document.getElementById('text-editor')
const crossIcon = document.getElementById('quitAll')
const toast = document.getElementById('toast')
const table = document.getElementById('linkTable')
const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

// helpers
let allA
let imgsIndex
let allImgs
const decode = a => decodeURIComponent(a).replace(location.origin, '')
const getArrowSelected = () => document.querySelector('.arrow-selected')
const getASelected = () => !getArrowSelected() ? false : getArrowSelected().parentElement.parentElement.querySelectorAll('a')[0]
const prependPath = a => a.startsWith('/') ? a : decodeURI(location.pathname) + a
const prevent = e => e.preventDefault()
const flicker = w => w.classList.remove('runFade') || void w.offsetWidth || w.classList.add('runFade')

// Manual upload
manualUpload.addEventListener('change', () => Array.from(manualUpload.files).forEach(f => isDupe(f.name) || postFile(f, '/' + f.name)), false)

// Soft nav
async function browseTo (href, flickerDone, skipHistory) {
  try {
    const r = await fetch(href, { credentials: 'include' })
    const t = await r.text()
    const parsed = new DOMParser().parseFromString(t, 'text/html')

    table.innerHTML = parsed.getElementById('linkTable').innerHTML
    const title = parsed.head.querySelector('title').innerText
    // check if is current path - if so skip following
    if (pageTitle.innerText !== title) {
      if (!skipHistory) {
        history.pushState({}, '', encodeURI(window.extraPath + title))
      }
      pageTitle.innerText = title
      pageH1.innerText = '.' + title
      setTitle()
    }

    init()
    if (flickerDone) flicker(okBadge)
  } catch (error) {
    flicker(sadBadge)
  }
}

window.onClickLink = e => {
  const a = e ? e.target : getASelected()

  if (e) {
    setCursorTo(e.target.innerText)
  }

  // always force download if ctrl pressed (also covers zipping folders)
  if (e && e.ctrlKey) {
    dl(a)
    return false
  }

  // follow dirs
  if (isFolder(a)) {
    browseTo(a.href)
    return false
  // enable notepad if relevant
  } else if (!window.ro && isTextFile(a.innerText) && !isEditorMode()) {
    padOn(a)
    return false
  // toggle picture carousel
  } else if (isPic(a.href) && !isPicMode()) {
    picsOn(a.href)
    return false
  // toggle videos mode
  } else if (isVideo(a.href) && !isVideoMode()) {
    videoOn(a.href)
    return false
  }

  // else just force download
  dl(a)
  return false
}

let softStatePushed
function pushSoftState (d) {
  if (softStatePushed) { return }
  softStatePushed = true
  history.pushState({}, '', encodeURI(d))
}

const refresh = () => browseTo(location.href, true)

const softPrev = () => history.replaceState({}, '', location.href.split('/').slice(0, -1).join('/') + '/')

const isAtExtraPath = url => location.origin + window.extraPath + '/../' === url
const prevPage = (url, skipHistory) => window.quitAll() || isAtExtraPath(url) || browseTo(url, false, skipHistory)

window.onpopstate = () => prevPage(location.href, true)

// RPC
function upload (id, what, path, cbDone, cbErr, cbUpdate) {
  const xhr = new XMLHttpRequest()
  xhr.open('POST', location.origin + window.extraPath + '/post')
  xhr.setRequestHeader('gossa-path', path)
  xhr.upload.addEventListener('load', cbDone)
  xhr.upload.addEventListener('progress', cbUpdate)
  xhr.upload.addEventListener('error', cbErr)
  xhr.upload.id = id
  xhr.send(what)
}

function rpc (call, args, cb) {
  console.log('RPC', call, args)
  const xhr = new XMLHttpRequest()
  xhr.open('POST', location.origin + window.extraPath + '/rpc')
  xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')
  xhr.send(JSON.stringify({ call, args }))
  xhr.onload = cb
  xhr.onerror = () => flicker(sadBadge)
}

const mkdirCall = (path, cb) => rpc('mkdirp', [prependPath(path)], cb)
const rmCall = (path1, cb) => rpc('rm', [prependPath(path1)], cb)
const mvCall = (path1, path2, cb) => rpc('mv', [path1, path2], cb)

// File upload
let totalDone = 0
let totalUploads = 0
let totalUploadsSize = 0
let totalUploadedSize = []

const dupe = test => allA.find(a => a.innerHTML.replace('/', '') === test)
const isDupe = t => dupe(t) ? alert(t + ' already already exists') || true : false

function shouldRefresh () {
  totalDone += 1
  if (totalUploads === totalDone) {
    window.onbeforeunload = null
    console.log('done uploading ' + totalDone + ' files')
    totalDone = 0
    totalUploads = 0
    totalUploadsSize = 0
    totalUploadedSize = []
    upBarPc.style.display = upBarName.style.display = 'none'
    table.classList.remove('uploading-table')
    setTimeout(refresh, 200)
  }
}

function updatePercent (ev) {
  totalUploadedSize[ev.target.id] = ev.loaded
  const ttlDone = totalUploadedSize.reduce((s, x) => s + x)
  const pc = Math.floor(100 * ttlDone / totalUploadsSize) + '%'
  upBarPc.innerText = pc
  upBarPc.style.width = pc
}

function postFile (file, path) {
  if (window.ro) return
  path = decodeURI(location.pathname).slice(0, -1) + path
  window.onbeforeunload = warningMsg

  table.classList.add('uploading-table')
  upBarPc.style.display = upBarName.style.display = 'block'
  totalUploads += 1
  totalUploadsSize += file.size
  upBarName.innerText = totalUploads > 1 ? totalUploads + ' files' : file.name

  const formData = new FormData()
  formData.append(file.name, file)
  upload(totalUploads, formData, encodeURIComponent(path), shouldRefresh, null, updatePercent)
}

const parseDomFolder = f => f.createReader().readEntries(e => e.forEach(i => parseDomItem(i)))

function parseDomItem (domFile, shoudCheckDupes) {
  if (shoudCheckDupes && isDupe(domFile.name)) {
    return
  }
  if (domFile.isFile) {
    domFile.file(f => postFile(f, domFile.fullPath))
  } else {
    // remove absolute path
    const f = domFile.fullPath.startsWith('/') ? domFile.fullPath.slice(1) : domFile.fullPath
    mkdirCall(f, () => parseDomFolder(domFile))
  }
}

function pushEntry (entry) {
  if (!entry.webkitGetAsEntry && !entry.getAsEntry) {
    return alert('Unsupported browser ! Please update to chrome/firefox.')
  } else {
    entry = entry.webkitGetAsEntry() || entry.getAsEntry()
  }

  parseDomItem(entry, true)
}

window.titleClick = function (e) {
  const p = Array.from(document.querySelector('h1').childNodes).map(k => k.innerText)
  const i = p.findIndex(s => s === e.target.innerText)
  const dst = p.slice(0, i + 1).join('').slice(1)
  const target = location.origin + window.extraPath + encodeURI(dst)
  browseTo(target, false)
}

// Move files and folders
const isFolder = e => e && e.href && e.innerText.endsWith('/')

const setBackgroundLinks = t => { t.classList.add('highlight') }

const getLink = () => document.querySelector('.highlight') || {}

const resetBackgroundLinks = () => { try { getLink().classList.remove('highlight') } catch(e) { /* */ } } // eslint-disable-line

// Not the nicest - sometimes, upon hover, firefox reports nodeName === '#text', and chrome reports nodeName === 'A'...
const getClosestRow = t => t.nodeName === '#text' ? t.parentElement.parentElement : t.nodeName === 'A' ? t.parentElement : t

let draggingSrc

upGrid.ondragend = upGrid.ondragexit = upGrid.ondragleave = e => {
  cancelDefault(e)
  upGrid.style.display = 'none'
}

// Handle hover
document.ondragenter = e => {
  if (isEditorMode() || isPicMode() || window.ro) { return }
  cancelDefault(e)
  resetBackgroundLinks()

  // Display upload grid when uploading new elements
  if (!draggingSrc) {
    upGrid.style.display = 'flex'
    e.dataTransfer.dropEffect = 'copy'
  // Or highlight entry if drag and drop
  } else if (draggingSrc) {
    const t = getClosestRow(e.target)
    isFolder(t.firstChild) && setBackgroundLinks(t)
  }
}

document.ondragstart = e => { draggingSrc = e.target.innerHTML }

document.ondragend = e => resetBackgroundLinks()

document.ondragover = e => {
  cancelDefault(e)
  return false
}

// Handle drop
document.ondrop = e => {
  if (window.ro) return

  cancelDefault(e)
  upGrid.style.display = 'none'
  let t = getLink().firstChild

  // move to a folder
  if (draggingSrc && t) {
    const dest = t.innerHTML + draggingSrc
    ensureMove() || mvCall(prependPath(draggingSrc), prependPath(dest), refresh)
  // ... or upload
  } else if (e.dataTransfer.items.length) {
    Array.from(e.dataTransfer.items).forEach(pushEntry)
  }

  resetBackgroundLinks()
  draggingSrc = null
  return false
}

// Notepad
const isEditorMode = () => editor.style.display === 'block'
const textTypes = ['.txt', '.rtf', '.md', '.markdown', '.log', '.yaml', '.yml']
const isTextFile = src => src && textTypes.find(type => src.toLocaleLowerCase().includes(type))
let fileEdited

function saveText (quitting) {
  const formData = new FormData()
  formData.append(fileEdited, editor.value)
  const path = encodeURIComponent(decodeURI(location.pathname) + fileEdited)
  upload(0, formData, path, () => {
    toast.style.display = 'none'
    if (!quitting) return
    clearInterval(window.padTimer)
    window.onbeforeunload = null
    resetView()
    softPrev()
    refresh()
  }, () => {
    toast.style.display = 'block'
    if (!quitting) return
    alert('cant save!\r\nleave window open to resume saving\r\nwhen connection back up')
  })
}

function padOff () {
  if (!isEditorMode()) { return }
  saveText(true)
  return true
}

async function padOn (a) {
  if (a) {
    try {
      fileEdited = a.innerHTML
      const f = await fetch(a.href, {
        credentials: 'include',
        headers: new Headers({ 'pragma': 'no-cache', 'cache-control': 'no-cache' })
      })
      editor.value = await f.text()
    } catch (error) {
      return alert('cant read file')
    }
  } else {
    fileEdited = prompt('new filename', '')
    if (!fileEdited) { return }
    fileEdited = isTextFile(fileEdited) ? fileEdited : fileEdited + '.txt'
    if (isDupe(fileEdited)) { return }
    editor.value = ''
  }

  console.log('editing file', fileEdited)
  setCursorTo(fileEdited)
  editor.style.display = crossIcon.style.display = 'block'
  table.style.display = 'none'
  editor.focus()
  window.onbeforeunload = warningMsg
  window.padTimer = setInterval(saveText, 5000)
  pushSoftState('?editor=' + fileEdited)
}

window.displayPad = padOn

// quit pictures or editor
function resetView () {
  softStatePushed = false
  table.style.display = 'table'
  picsHolder.src = transparentPixel
  videoHolder.src = ''
  editor.style.display = pics.style.display = video.style.display = crossIcon.style.display = 'none'
  scrollToArrow()
}

window.quitAll = () => helpOff() || picsOff() || videosOff() || padOff()

// Mkdir icon
window.mkdirBtn = function () {
  const folder = prompt('new folder name', '')
  if (folder && !isDupe(folder)) {
    mkdirCall(folder, refresh)
  }
}

// Icon click handler
const getBtnA = e => e.target.closest('tr').querySelector('a')

window.rm = e => {
  if (window.ro) return true
  clearTimeout(window.clickToken)
  const target = e.key ? getASelected() : getBtnA(e)
  if (target.innerText === '../') return
  if (rmMsg()) return

  moveArrow()
  rmCall(decode(target.href), refresh)
}

window.rename = (e, commit) => {
  if (window.ro) return true
  clearTimeout(window.clickToken)

  if (!commit) {
    window.clickToken = setTimeout(window.rename, 300, e, true)
    return
  }

  const target = e.key ? getASelected() : getBtnA(e)
  if (target.innerText === '../') return
  const chg = prompt('rename to', target.innerText)
  if (chg && !isDupe(chg)) {
    mvCall(prependPath(target.innerText), prependPath(chg), refresh)
  }
}

function aboveBelowRightin (el) {
  const itemPos = el.getBoundingClientRect()
  return itemPos.top < 0 ? -1 : itemPos.bottom > window.innerHeight ? 1 : 0
}

function scrollToArrow () {
  const el = getASelected()
  while (1) {
    const pos = aboveBelowRightin(el)
    if (pos === -1) {
      scrollBy(0, -300)
    } else if (pos === 1) {
      scrollBy(0, 300)
    } else {
      break
    }
  }
}

function clearArrowSelected () {
  const arr = getArrowSelected()
  if (!arr) { return }
  arr.classList.remove('arrow-selected')
}

window.setCursorTo = setCursorTo
function setCursorTo (where) {
  if (!where) return false
  clearArrowSelected()
  let a = allA.find(el => el.innerText === where || el.innerText === where + '/')

  if (!a) {
    if (allA[0].innerText === '../') {
      a = allA[1] || allA[0]
    } else {
      a = allA[0]
    }
  }

  const icon = a.parentElement.parentElement.querySelectorAll('.arrow-icon')[0]
  icon.classList.add('arrow-selected')
  scrollToArrow()
  storeArrow(where)
  return true
}

function moveArrow (down) {
  const all = Array.from(document.querySelectorAll('.arrow-icon'))
  let i = all.findIndex(el => el.classList.contains('arrow-selected'))

  clearArrowSelected()

  if (down) {
    i = all[i + 1] ? i + 1 : 0
  } else {
    i = all[i - 1] ? i - 1 : all.length - 1
  }

  all[i].classList.add('arrow-selected')
  storeArrow(getASelected().innerText)
  scrollToArrow()
}

const storeArrow = src => localStorage.setItem('last-selected' + window.extraPath + location.pathname, src)

const isTop = () => window.scrollY === 0
const isBottom = () => (window.innerHeight + window.scrollY) >= document.body.offsetHeight
const hasScroll = () => table.clientHeight > window.innerHeight

function movePage (up) {
  const current = getASelected().href

  if (!hasScroll()) return

  if (!up) {
    const i = allA.findIndex(e => aboveBelowRightin(e) === 1)
    if (isTop() && current !== allA[i - 1].href) {
      return setCursorTo(allA[i - 1].innerText)
    } else if (isBottom() && current !== allA[allA.length - 1].href) {
      return setCursorTo(allA[allA.length - 1].innerText)
    }

    if (!allA[i - 1]) return
    setCursorTo(allA[i - 1].innerText)
    scrollBy(0, window.innerHeight - 100)
  } else {
    const i = allA.findIndex(e => aboveBelowRightin(e) === 0)
    if (isTop() && current !== allA[0].href) {
      return setCursorTo(allA[0].innerText)
    } else if (isBottom() && current !== allA[i].href) {
      return setCursorTo(allA[i].innerText)
    }

    scrollBy(0, -(window.innerHeight - 100))
    setCursorTo(allA[i].innerText)
  }
}

// Pictures carousel
const picTypes = ['.jpg', '.jpeg', '.png', '.gif']
const isPic = src => src && picTypes.find(type => src.toLocaleLowerCase().includes(type))
const isPicMode = () => pics.style.display === 'flex'
window.picsNav = () => picsNav(true)

function setImage () {
  const src = allImgs[imgsIndex]
  picsHolder.src = src
  const name = src.split('/').pop()
  setCursorTo(decodeURI(name))
  history.replaceState({}, '', encodeURI(name))
}

function picsOn (href) {
  imgsIndex = allImgs.findIndex(el => el.includes(href))
  setImage()
  table.style.display = 'none'
  crossIcon.style.display = 'block'
  pics.style.display = 'flex'
  const name = href.split('/').pop()
  pushSoftState(name)
  return true
}

function picsOff () {
  if (!isPicMode()) { return }
  resetView()
  softPrev()
  return true
}

function picsNav (down) {
  if (!isPicMode()) { return false }

  if (down) {
    imgsIndex = allImgs[imgsIndex + 1] ? imgsIndex + 1 : 0
  } else {
    imgsIndex = allImgs[imgsIndex - 1] ? imgsIndex - 1 : allImgs.length - 1
  }

  setImage()
  return true
}

let picsTouchStart = 0

picsHolder.addEventListener('touchstart', e => {
  picsTouchStart = e.changedTouches[0].screenX
}, false)

picsHolder.addEventListener('touchend', e => {
  if (e.changedTouches[0].screenX < picsTouchStart) {
    picsNav(true)
  } else if (e.changedTouches[0].screenX > picsTouchStart) {
    picsNav(false)
  }
}, false)

// Video player
const videosTypes = ['.mp4', '.webm', '.ogv', '.ogg', '.mp3', '.flac', '.wav']
const isVideo = src => src && videosTypes.find(type => src.toLocaleLowerCase().includes(type))
const isVideoMode = () => video.style.display === 'flex'
const videoFs = () => video.requestFullscreen()
const videoFf = future => { videoHolder.currentTime += future ? 10 : -10 }
const videoSound = up => { videoHolder.volume += up ? 0.1 : -0.1 }
videoHolder.oncanplay = () => videoHolder.play()

async function videoOn (src) {
  const name = src.split('/').pop()
  table.style.display = 'none'
  crossIcon.style.display = 'block'
  video.style.display = 'flex'
  videoHolder.pause()

  const time = localStorage.getItem('video-time' + src)
  videoHolder.currentTime = parseInt(time) || 0

  videoHolder.src = src
  pushSoftState(decodeURI(name))
  return true
}

function videosOff () {
  if (!isVideoMode()) { return }
  localStorage.setItem('video-time' + videoHolder.src, videoHolder.currentTime)
  resetView()
  softPrev()
  return true
}

// help
const isHelpMode = () => help.style.display === 'block'

const helpToggle = () => isHelpMode() ? helpOff() : helpOn()

function helpOn () {
  help.style.display = 'block'
  table.style.display = 'none'
}

window.helpOff = helpOff
function helpOff () {
  if (!isHelpMode()) return
  help.style.display = 'none'
  table.style.display = 'table'
  return true
}

// Paste handler
let cuts = []
function onPaste () {
  if (!cuts.length) { return refresh() }
  const a = getASelected()
  const root = cuts.pop()
  const filename = root.split('/').pop()
  const pwd = decodeURIComponent(location.pathname)
  const dest = isFolder(a) ? pwd + a.innerHTML : pwd
  mvCall(root, dest + filename, onPaste)
}

function onCut () {
  const a = getASelected()
  a.classList.add('linkSelected')
  cuts.push(prependPath(decode(a.href)))
}

function dl (a) {
  const orig = a.onclick
  a.onclick = ''

  // download as zip if folder
  if (isFolder(a)) {
    const loc = a.href
    a.href = window.extraPath + '/zip?zipPath=' + encodeURIComponent(prependPath(a.innerText)) + '&zipName=' + encodeURIComponent(a.innerText.slice(0, -1))
    a.click()
    a.href = loc
  } else {
    a.download = a.innerText
    a.click()
    a.download = ''
  }

  a.onclick = orig
}

// Kb handler
let typedPath = ''
let typedToken = null

function cpPath () {
  var t = document.createElement('textarea')
  t.value = getASelected().href
  document.body.appendChild(t)
  t.select()
  document.execCommand('copy')
  document.body.removeChild(t)
}

document.body.addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    return resetBackgroundLinks() || window.quitAll()
  }

  if (isHelpMode()) { return prevent(e) || window.quitAll() }

  if (isEditorMode()) { return }

  if (isPicMode()) {
    switch (e.code) {
      case 'ArrowLeft':
      case 'ArrowUp':
        return prevent(e) || picsNav(false)

      case 'Enter':
      case 'Tab':
      case 'ArrowRight':
      case 'ArrowDown':
        return prevent(e) || picsNav(true)
    }
    return
  }

  if (isVideoMode()) {
    switch (e.code) {
      case 'ArrowDown':
      case 'ArrowUp':
        return prevent(e) || videoSound(e.code === 'ArrowUp')

      case 'ArrowLeft':
      case 'ArrowRight':
        return prevent(e) || videoFf(e.code === 'ArrowRight')

      case 'KeyF':
        return prevent(e) || videoFs()
    }
    return
  }

  // Ctrl keys
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
    switch (e.code) {
      case 'KeyC':
        return prevent(e) || isRo() || cpPath()

      case 'KeyH':
        return prevent(e) || isRo() || helpToggle()

      case 'KeyX':
        return prevent(e) || isRo() || onCut()

      case 'KeyR':
        return prevent(e) || refresh()

      case 'KeyV':
        return prevent(e) || isRo() || ensureMove() || onPaste()

      case 'Backspace':
        return prevent(e) || isRo() || window.rm(e)

      case 'KeyE':
        return prevent(e) || isRo() || window.rename(e)

      case 'KeyM':
        return prevent(e) || isRo() || window.mkdirBtn()

      case 'KeyU':
        return prevent(e) || isRo() || manualUpload.click()

      case 'Enter':
      case 'ArrowRight':
        return prevent(e) || dl(getASelected())
    }
  }

  switch (e.code) {
    case 'Tab':
    case 'ArrowDown':
      return prevent(e) || moveArrow(true)

    case 'ArrowUp':
      return prevent(e) || moveArrow(false)

    case 'Enter':
    case 'ArrowRight':
      return prevent(e) || window.onClickLink()

    case 'ArrowLeft':
      return prevent(e) || prevPage(location.href + '../')

    case 'PageDown':
    case 'PageUp':
      return prevent(e) || movePage(e.key === 'PageUp')

    case 'Space':
      return prevent(e) || movePage(e.shiftKey)
  }

  // text search
  if (e.code.includes('Key') && !e.ctrlKey && !e.metaKey) {
    typedPath += e.code.replace('Key', '').toLocaleLowerCase()
    clearTimeout(typedToken)
    typedToken = setTimeout(() => { typedPath = '' }, 1000)

    const a = allA.find(el => el.innerText.toLocaleLowerCase().startsWith(typedPath)) || allA.find(el => el.innerText.toLocaleLowerCase().includes(typedPath))
    if (!a) { return }
    setCursorTo(a.innerText)
  }
}, false)

function setTitle () {
  pageH1.innerHTML = '<span>' + pageH1.innerText.split('/').join('/</span><span>') + '</span>'
}

function init () {
  allA = Array.from(document.querySelectorAll('a.list-links'))
  allImgs = allA.map(el => el.href).filter(isPic)
  imgsIndex = softStatePushed = 0

  const successRestore = setCursorTo(localStorage.getItem('last-selected' + window.extraPath + location.pathname))
  if (!successRestore) {
    const entries = table.querySelectorAll('.arrow-icon')
    entries.length === 1 ? entries[0].classList.add('arrow-selected') : entries[1].classList.add('arrow-selected')
  }

  setTitle()
  scrollToArrow()
  console.log('browsed to ' + location.href)

  if (cuts.length) {
    const match = allA.filter(a => cuts.find(c => c === decode(a.href)))
    match.forEach(m => m.classList.add('linkSelected'))
  }

  // restore editor if was queried
  if (location.search.includes('?editor=')) {
    const cleanURL = location.href.replace('?editor=', '')
    const matchingA = allA.find(a => a.href === cleanURL)
    padOn(matchingA)
  }
}
init()
