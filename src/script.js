/* eslint-env browser */
/* eslint-disable no-multi-str */

function cancelDefault (e) {
  e.preventDefault()
  e.stopPropagation()
}

const warningMsg = () => 'Leaving will interrupt transfer?\n'
const rmMsg = () => !confirm('Remove file?\n')
const ensureMove = () => !confirm('move items?')

const barName = document.getElementById('dlBarName')
const barPc = document.getElementById('dlBarPc')
const barDiv = document.getElementById('progress')
const upGrid = document.getElementById('drop-grid')
const pics = document.getElementById('pics')
const picsHolder = document.getElementById('picsHolder')
const manualUpload = document.getElementById('clickupload')
const okBadge = document.getElementById('ok')
const sadBadge = document.getElementById('sad')
const pageTitle = document.head.querySelector('title')
const pageH1 = document.body.querySelector('h1')
const editor = document.getElementById('text-editor')
const crossIcon = document.getElementById('quitAll')
const toast = document.getElementById('toast')
const table = document.querySelector('table')

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
function browseTo (href, flickerDone, skipHistory) {
  fetch(href, { credentials: 'include' }).then(r => r.text().then(t => {
    const parsed = new DOMParser().parseFromString(t, 'text/html')
    table.innerHTML = parsed.querySelector('table').innerHTML

    const title = parsed.head.querySelector('title').innerText
    // check if is current path - if so skip following
    if (pageTitle.innerText !== title) {
      pageTitle.innerText = title
      pageH1.innerText = '.' + title

      if (!skipHistory) {
        history.pushState({}, '', encodeURI(title))
      }
    }

    if (flickerDone) {
      flicker(okBadge)
    }

    init()
  })).catch(() => flicker(sadBadge))
}

window.onClickLink = e => {
  storeLastArrowSrc(e.target.href)

  // follow dirs
  if (isFolder(e.target)) {
    browseTo(e.target.href)
    return false
  // enable notepad if relevant
  } else if (isTextFile(e.target.innerText) && !isEditorMode()) {
    displayPad(e.target)
    return false
  // toggle picture carousel
  } else if (isPic(e.target.href) && !isPicMode()) {
    picsOn(e.target.href)
    return false
  }

  // else just click link
  return true
}

let softStatePushed
function pushSoftState (d) {
  if (softStatePushed) { return }
  softStatePushed = true
  history.pushState({}, '', encodeURI(d))
}

const refresh = () => browseTo(location.href, true)

const softPrev = () => history.replaceState({}, '', decodeURI(location.href.split('/').slice(0, -1).join('/') + '/'))

const prevPage = (url, skipHistory) => window.quitAll() || browseTo(url, false, skipHistory)

window.onpopstate = () => prevPage(location.href, true)

// RPC
function rpcFs (call, args, cb) {
  console.log('RPC', call, args)
  const xhr = new XMLHttpRequest()
  xhr.open('POST', location.origin + '/rpc')
  xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')
  xhr.send(JSON.stringify({ call, args }))
  xhr.onload = cb
  xhr.onerror = () => flicker(sadBadge)
}

const mkdirCall = (path, cb) => rpcFs('mkdirp', [prependPath(path)], cb)
const rmCall = (path1, cb) => rpcFs('rm', [prependPath(path1)], cb)
const mvCall = (path1, path2, cb) => rpcFs('mv', [path1, path2], cb)

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
    console.log('Done uploading ' + totalDone + ' files')
    totalDone = 0
    totalUploads = 0
    totalUploadsSize = 0
    totalUploadedSize = []
    barDiv.style.display = 'none'
    table.classList.remove('uploading-table')
    refresh()
  }
}

function updatePercent (ev) {
  totalUploadedSize[ev.target.id] = ev.loaded
  const ttlDone = totalUploadedSize.reduce((s, x) => s + x)
  const pc = Math.floor(100 * ttlDone / totalUploadsSize) + '%'
  barPc.innerText = pc
  barPc.style.width = pc
}

function postFile (file, path) {
  path = decodeURI(location.pathname).slice(0, -1) + path
  window.onbeforeunload = warningMsg

  table.classList.add('uploading-table')
  barDiv.style.display = 'block'
  totalUploads += 1
  totalUploadsSize += file.size
  barName.innerText = totalUploads > 1 ? totalUploads + ' files' : file.name

  const formData = new FormData()
  formData.append(file.name, file)

  const xhr = new XMLHttpRequest()
  xhr.open('POST', location.origin + '/post')
  xhr.setRequestHeader('gossa-path', encodeURIComponent(path))
  xhr.upload.addEventListener('load', shouldRefresh)
  xhr.upload.addEventListener('progress', updatePercent)
  xhr.upload.id = totalUploads
  xhr.send(formData)
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

// Move files and folders
const isFolder = e => e && e.href && e.innerText.endsWith('/')

const setBackgroundLinks = t => { t.classList.add('highlight') }

const getLink = () => document.querySelector('.highlight') || {}

const resetBackgroundLinks = () => { try { getLink().classList.remove('highlight') } catch(e) { /* */ } } // eslint-disable-line

// Not the nicest - sometimes, upon hover, firefox reports nodeName === '#text', and chrome reports nodeName === 'A'...
const getClosestRow = t => t.nodeName === '#text' ? t.parentElement.parentElement : t.nodeName === 'A' ? t.parentElement : t

let draggingSrc

upGrid.ondragleave = e => {
  cancelDefault(e)
  upGrid.style.display = 'none'
}

// Handle hover
document.ondragenter = e => {
  if (isEditorMode() || isPicMode()) { return }
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
function saveText (cbok, cberr) {
  const formData = new FormData()
  formData.append(fileEdited, editor.innerText)
  fetch(location.origin + '/post', {
    method: 'POST',
    credentials: 'include',
    body: formData,
    headers: new Headers({ 'gossa-path': encodeURIComponent(decodeURI(location.pathname)) })
  }).then(() => {
    toast.style.display = 'none'
    cbok && cbok()
  }).catch(() => {
    toast.style.display = 'block'
    cberr && cberr()
  })
}

const isEditorMode = () => editor.style.display === 'block'
const textTypes = ['.txt', '.rtf', '.md', '.log']
const isTextFile = src => src && textTypes.find(type => src.toLocaleLowerCase().includes(type))
let fileEdited

function padOff () {
  if (!isEditorMode()) { return }

  saveText(() => {
    clearInterval(window.padTimer)
    window.onbeforeunload = null
    resetView()
    softPrev()
    refresh()
  }, () => {
    alert('cant save!\r\nleave window open to resume saving\r\nwhen connection back up')
  })

  return true
}

async function displayPad (a) {
  if (a) {
    try {
      fileEdited = a.innerHTML
      const f = await fetch(a.href, {
        credentials: 'include',
        headers: new Headers({
          'pragma': 'no-cache',
          'cache-control': 'no-cache'
        })
      })
      editor.innerText = await f.text()
    } catch (error) {
      return alert('cant read file')
    }
  } else {
    fileEdited = prompt('new filename', '')
    if (!fileEdited) { return }
    fileEdited = isTextFile(fileEdited) ? fileEdited : fileEdited + '.txt'
    editor.innerText = ''
    saveText()
    storeLastArrowSrc(location.href + fileEdited)
  }

  console.log('editing file', fileEdited)
  editor.style.display = crossIcon.style.display = 'block'
  table.style.display = 'none'
  editor.focus()
  window.onbeforeunload = warningMsg
  window.padTimer = setInterval(saveText, 5000)
  pushSoftState(fileEdited)
}

window.displayPad = displayPad

// quit pictures or editor
function resetView () {
  table.style.display = 'table'
  editor.style.display = pics.style.display = crossIcon.style.display = 'none'
}

window.quitAll = () => picsOff() || padOff()

// Mkdir icon
window.mkdirBtn = function () {
  const folder = prompt('new folder name', '')
  if (folder && !isDupe(folder)) {
    mkdirCall(folder, refresh)
  }
}

// Icon click handler
const getBtnA = e => e.target.parentElement.parentElement.querySelector('a')

window.rm = e => {
  clearTimeout(window.clickToken)
  const path = e.key ? getASelected().href : getBtnA(e).pathname
  rmMsg() || rmCall(decode(path), refresh)
}

window.rename = (e, commit) => {
  clearTimeout(window.clickToken)

  if (!commit) {
    window.clickToken = setTimeout(window.rename, 300, e, true)
    return
  }

  const orig = e.key ? getASelected().innerHTML : getBtnA(e).innerHTML
  const chg = prompt('rename to', orig)
  if (chg && !isDupe(chg)) {
    mvCall(prependPath(orig), prependPath(chg), refresh)
  }
}

// Keyboard Arrow
const storeLastArrowSrc = src => localStorage.setItem('last-selected' + location.href, src)

function scrollToArrow () {
  const pos = getArrowSelected().getBoundingClientRect()
  if (pos.top < 0 || pos.bottom > window.innerHeight) {
    setTimeout(scrollTo, 50, 0, pos.y)
  }
}

function clearArrowSelected () {
  const arr = getArrowSelected()
  if (!arr) { return }
  arr.classList.remove('arrow-selected')
}

function restoreCursorPos () {
  clearArrowSelected()
  const hrefSelected = localStorage.getItem('last-selected' + location.href)
  let a = allA.find(el => el.href === hrefSelected)

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
  storeLastArrowSrc(getASelected().href)

  const itemPos = all[i].getBoundingClientRect()

  if (i === 0) {
    scrollTo(0, 0)
  } else if (i === all.length - 1) {
    scrollTo(0, document.documentElement.scrollHeight)
  } else if (itemPos.top < 0) {
    scrollBy(0, -200)
  } else if (itemPos.bottom > window.innerHeight) {
    scrollBy(0, 200)
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
  storeLastArrowSrc(src)
  restoreCursorPos()
  history.replaceState({}, '', encodeURI(src.split('/').pop()))
}

function picsOn (href) {
  imgsIndex = allImgs.findIndex(el => el.includes(href))
  setImage()
  table.style.display = 'none'
  crossIcon.style.display = 'block'
  pics.style.display = 'flex'
  pushSoftState(href.split('/').pop())
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

function setCursorToClosestTyped () {
  const a = allA.find(el => el.innerText.toLocaleLowerCase().startsWith(typedPath))
  if (!a) { return }
  storeLastArrowSrc(a.href)
  restoreCursorPos()
}

document.body.addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    return resetBackgroundLinks() || picsOff() || padOff()
  }

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

  switch (e.code) {
    case 'Tab':
    case 'ArrowDown':
      return prevent(e) || moveArrow(true)

    case 'ArrowUp':
      return prevent(e) || moveArrow(false)

    case 'Enter':
    case 'ArrowRight':
      return prevent(e) || getASelected().click()

    case 'ArrowLeft':
      return prevent(e) || prevPage(location.href + '../')
  }

  // Ctrl keys
  if (e.ctrlKey || e.metaKey) {
    switch (e.code) {
      case 'KeyC':
        return prevent(e) || cpPath()

      case 'KeyX':
        return prevent(e) || onCut()

      case 'KeyV':
        return prevent(e) || ensureMove() || onPaste()

      case 'Backspace':
        return prevent(e) || window.rm(e)

      case 'KeyE':
        return prevent(e) || window.rename(e)

      case 'KeyD':
        return prevent(e) || window.mkdirBtn()

      case 'KeyU':
        return prevent(e) || manualUpload.click()
    }
  }

  // text search
  if (e.code.includes('Key') && !e.ctrlKey && !e.metaKey) {
    typedPath += e.code.replace('Key', '').toLocaleLowerCase()
    clearTimeout(typedToken)
    typedToken = setTimeout(() => { typedPath = '' }, 1000)
    setCursorToClosestTyped()
  }
}, false)

function init () {
  allA = Array.from(document.querySelectorAll('a.list-links'))
  allImgs = allA.map(el => el.href).filter(isPic)

  imgsIndex = softStatePushed = 0
  restoreCursorPos()
  console.log('Browsed to ' + location.href)

  if (cuts.length) {
    const match = allA.filter(a => cuts.find(c => c === decode(a.href)))
    match.forEach(m => m.classList.add('linkSelected'))
  }
}
init()
