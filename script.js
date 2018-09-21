/* eslint-env browser */
/* global allA  */
/* eslint-disable no-multi-str */

function cancelDefault (e) {
  e.preventDefault()
  e.stopPropagation()
}

// RPC
function rpcFs (call, args, cb) {
  // Prefix path with pwd if not absolute
  const decodedPath = decodeURI(location.pathname)
  args = args.map(a => a.startsWith('/') ? a : decodedPath + a)

  console.log('RPC', call, args)
  const xhr = new window.XMLHttpRequest()
  xhr.open('POST', location.origin + '/rpc')
  xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')
  xhr.send(JSON.stringify({ call, args }))
  xhr.onload = cb
}

// RPC Handlers
const mkdirCall = (path, cb) => rpcFs('mkdirp', [path], cb)

const mvCall = (path1, path2, cb) => rpcFs('mv', [path1, path2], cb)

// Mkdir switch
window.mkdirBtn = function () {
  const folder = window.prompt('New folder name', '')

  if (!folder) {
    return
  } else if (checkDupes(folder)) {
    return window.alert('Name already already exists')
  }

  mkdirCall(folder, refresh)
}

function warning (e) {
  return 'Leaving will interrupt transfer\nAre you sure you want to leave?'
}

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
    refresh()
  }
}

const checkDupes = test => allA.find(a => a.innerText.replace('/', '') === test)

const barName = document.getElementById('dlBarName')

const barPc = document.getElementById('dlBarPc')

const barDiv = document.getElementById('progress')

let totalDone = 0
let totalUploads = 0
let totalUploadsSize = 0
let totalUploadedSize = []

function updatePercent (ev) {
  totalUploadedSize[ev.target.id] = ev.loaded
  const ttlDone = totalUploadedSize.reduce((s, x) => s + x)
  const pc = Math.floor(100 * ttlDone / totalUploadsSize) + '%'
  barPc.innerText = pc
  barPc.style.width = pc
}

function postFile (file, path) {
  path = decodeURI(location.pathname).slice(0, -1) + path
  window.onbeforeunload = warning

  barDiv.style.display = 'block'
  totalUploads += 1
  totalUploadsSize += file.size
  barName.innerText = totalUploads > 1 ? totalUploads + ' files' : file.name

  const formData = new window.FormData()
  formData.append(file.name, file)

  const xhr = new window.XMLHttpRequest()
  xhr.open('POST', location.origin + '/post')
  xhr.setRequestHeader('gossa-path', encodeURIComponent(path))
  xhr.upload.addEventListener('load', shouldRefresh)
  xhr.upload.addEventListener('progress', updatePercent)
  xhr.upload.id = totalUploads
  xhr.send(formData)
}

const parseDomFolder = f => {
  f.createReader().readEntries(e => e.forEach(i => parseDomItem(i)))
}

function parseDomItem (domFile, shoudCheckDupes) {
  if (shoudCheckDupes && checkDupes(domFile.name)) {
    return window.alert(domFile.name + ' already exists !')
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
    return window.alert('Unsupported browser ! Please update to chrome/firefox.')
  } else {
    entry = entry.webkitGetAsEntry() || entry.getAsEntry()
  }

  parseDomItem(entry, true)
}

// Move files and folders
const isTextEvent = e => e.dataTransfer.items[0].type === 'text/plain'

const isFolder = e => e && e.href && e.innerText.endsWith('/')

const resetBackgroundLinks = () => { allA.forEach(a => { a.parentElement.style.backgroundColor = 'unset' }) }

const setBackgroundLinks = t => { t.style.backgroundColor = 'rgba(123, 123, 123, 0.2)' }

const getLink = e => e.target.parentElement.querySelectorAll('a.list-links')[0]

const upGrid = document.getElementById('drop-grid')

document.ondragenter = (e) => {
  if (isPicMode()) { return }
  cancelDefault(e)

  resetBackgroundLinks()

  if (isTextEvent(e) && (isFolder(e.target) || isFolder(e.target.firstChild))) {
    const t = getLink(e)
    if (!t) return
    setBackgroundLinks(t.parentElement)
  }

  if (!isTextEvent(e)) {
    upGrid.style.display = 'flex'
    e.dataTransfer.dropEffect = 'copy'
  }
}

upGrid.ondragleave = (e) => {
  cancelDefault(e)
  upGrid.style.display = 'none'
}

document.ondragover = (e) => {
  cancelDefault(e)
  return false
}

// Handle drop - upload or move
document.ondrop = (e) => {
  cancelDefault(e)
  upGrid.style.display = 'none'
  resetBackgroundLinks()

  if (isTextEvent(e)) {
    const t = e.target.classList.contains('fav') ? e.target : getLink(e)
    if (!t || !t.innerText.endsWith('/')) return
    e.dataTransfer.items[0].getAsString(s => {
      const root = decodeURI(s.replace(location.href, ''))
      const dest = t.innerText + root
      mvCall(root, dest, refresh)
    })
  } else {
    Array.from(e.dataTransfer.items).forEach(pushEntry)
  }

  return false
}

const getArrowSelected = () => document.querySelectorAll('i.arrow-selected')[0]

function getASelected () {
  const dest = getArrowSelected()
  return !dest ? false : dest.parentElement.parentElement.querySelectorAll('a')[0]
}

function scrollToArrow () {
  const pos = getArrowSelected().getBoundingClientRect()
  window.scrollTo(0, pos.y)
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

const storeLastArrowSrc = src => localStorage.setItem('last-selected' + location.href, src)

function moveArrow (down) {
  const all = Array.from(document.querySelectorAll('i.arrow-icon'))
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
    window.scrollTo(0, 0)
  } else if (i === all.length - 1) {
    window.scrollTo(0, document.documentElement.scrollHeight)
  } else if (itemPos.top < 0) {
    window.scrollBy(0, -200)
  } else if (itemPos.bottom > window.innerHeight) {
    window.scrollBy(0, 200)
  }
}

const refresh = () => browseTo(location.href)

const prevPage = () => browseTo(location.href + '../')

window.onpopstate = prevPage

function browseTo (href) {
  window.fetch(href).then(r => r.text().then(t => {
    const parsed = new window.DOMParser().parseFromString(t, 'text/html')
    const table = parsed.querySelectorAll('table')[0].innerHTML
    document.body.querySelectorAll('table')[0].innerHTML = table

    const title = parsed.head.querySelectorAll('title')[0].innerText
    // check if is current path - if so skip following
    if (document.head.querySelectorAll('title')[0].innerText !== title) {
      document.head.querySelectorAll('title')[0].innerText = title
      document.body.querySelectorAll('h1')[0].innerText = '.' + title
      window.history.pushState({}, '', window.encodeURI(title))
    }

    init()
  }))
}

function cpPath () {
  var t = document.createElement('textarea')
  t.value = getASelected().href
  document.body.appendChild(t)
  t.select()
  document.execCommand('copy')
  document.body.removeChild(t)
}

const pics = document.getElementById('pics')
const picsHolder = document.getElementById('picsHolder')
const picsLabel = document.getElementById('picsLabel')

const picTypes = ['.jpg', '.jpeg', '.png', '.gif']
const isPic = src => src && picTypes.find(type => src.toLocaleLowerCase().includes(type))

const isPicMode = () => pics.style.display === 'flex'

let imgsIndex
let allImgs

function setImage (src) {
  src = src || allImgs[imgsIndex]
  picsLabel.innerText = src.split('/').pop()
  picsHolder.src = src
  storeLastArrowSrc(src)
}

function picsOn (ifImgSelected) {
  const href = getASelected().href

  if (isPicMode()) {
    return false
  } else if (ifImgSelected && !isPic(href)) {
    return false
  }

  if (isPic(href)) {
    imgsIndex = allImgs.findIndex(el => el.includes(href))
    setImage()
  } else {
    setImage(picsHolder.src)
  }

  pics.style.display = 'flex'
  return true
}

function picsToggle () {
  if (!isPicMode()) {
    picsOn()
  } else {
    pics.style.display = 'none'
    restoreCursorPos()
  }
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

let allA
let typedPath = ''
let typedToken = null

function setCursorToClosestTyped () {
  const a = allA.find(el => el.innerText.toLocaleLowerCase().startsWith(typedPath))
  if (!a) { return }
  storeLastArrowSrc(a.href)
  restoreCursorPos()
}

// Kb handler
document.body.addEventListener('keydown', e => {
  switch (e.code) {
    case 'Tab':
    case 'ArrowDown':
      e.preventDefault()
      return picsNav(true) || moveArrow(true)

    case 'ArrowUp':
      e.preventDefault()
      return picsNav(false) || moveArrow(false)

    case 'Enter':
    case 'Space':
    case 'ArrowRight':
      e.preventDefault()
      return picsOn(true) || picsNav(true) || getASelected().click()

    case 'ArrowLeft':
      e.preventDefault()
      return picsNav(false) || prevPage()

    case 'Escape':
      if (isPicMode()) {
        e.preventDefault()
        return picsToggle()
      }
  }

  // Ctrl keys
  if (e.ctrlKey || e.metaKey) {
    switch (e.code) {
      case 'KeyD':
        e.preventDefault()
        return isPicMode() || window.mkdirBtn()

      case 'KeyC':
        e.preventDefault()
        return isPicMode() || cpPath()
    }
  }

  // Any other key, for text search
  if (e.code.includes('Key')) {
    typedPath += e.code.replace('Key', '').toLocaleLowerCase()
    window.clearTimeout(typedToken)
    typedToken = setTimeout(() => { typedPath = '' }, 1000)
    setCursorToClosestTyped()
  }
}, false)

window.onClickLink = e => {
  if (!e.target.innerText.endsWith('/')) { return true }
  storeLastArrowSrc(e.target.href)
  browseTo(e.target.href)
  return false
}

function init () {
  allA = Array.from(document.querySelectorAll('a.list-links'))
  allImgs = allA.map(el => el.href).filter(isPic)
  document.getElementsByClassName('icon-large-images')[0].style.display = allImgs.length > 0 ? 'inline-block' : 'none'

  imgsIndex = 0
  restoreCursorPos()
  console.log('Browsed to ' + location.href)
}

init()

window.picsToggle = picsToggle
window.picsNav = () => picsNav(true)
