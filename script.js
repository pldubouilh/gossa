function cancelDefault (e) {
  e.preventDefault()
  e.stopPropagation()
}

const checkDupes = test => allA.find(a => a.innerText.replace('/', '') === test)

function rpcFs (call, args, cb) {
  const decodedPath = decodeURI(window.location.pathname)
  args = args.map(a => a.startsWith('/') ? a.slice(1) : a)
  args = args.map(a => encodeURIComponent(decodedPath + a))

  const xhr = new window.XMLHttpRequest()
  xhr.open('POST', window.location.origin + '/rpc')
  xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')
  xhr.send(JSON.stringify({call, args}))
  xhr.onload = cb
}

const mkdirCall = (path, cb) => rpcFs('mkdirp', [path], cb)

function mkdir () {
  const folder = window.prompt('New folder name', '')

  if (!folder) {
    return
  } else if (checkDupes(folder)) {
    return window.alert('Name already already exists')
  }

  mkdirCall(folder, () => browseTo(location.href))
}

function warning (e) {
  return 'Leaving will interrupt transfer\nAre you sure you want to leave?'
}

function newBar (name) {
  const id = Math.random().toString(36).substring(7)

  document.getElementById('progressBars').innerHTML += '\
    <div id="' + id + '" class="barBackground">\
      <span> ' + name.split('/').pop() + ' <span>\
      <div class="barForeground">1%</div>\
    </div>'
  return id
}

function updatePercent (id, percent) {
  const el = document.getElementById(id).querySelectorAll('div.barForeground')[0]
  const width = Math.floor(100 * percent).toString() + '%'
  el.innerText = width
  el.style.width = width
}

function shouldRefresh () {
  totalDone += 1
  if (totalUploads === totalDone) {
    window.onbeforeunload = null
    console.log('Done uploading ' + totalDone + ' files')
    totalDone = 0
    totalUploads = 0
    document.getElementById('progressBars').innerHTML = ''
    browseTo(location.href)
  }
}

function postFile (file, path) {
  totalUploads += 1
  window.onbeforeunload = warning

  const xhr = new window.XMLHttpRequest()
  path = decodeURI(location.pathname).slice(0, -1) + path

  xhr.open('POST', window.location.origin + '/post')
  xhr.setRequestHeader("bossa-path", encodeURIComponent(path))
  xhr.upload.id = newBar(path)

  const formData = new window.FormData()
  formData.append(file.name, file)

  xhr.upload.addEventListener('progress', a => {
    console.log("YA")
    updatePercent(a.target.id, a.loaded / a.total)
  })

  xhr.upload.addEventListener('load', shouldRefresh)

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
    mkdirCall(domFile.fullPath, () => parseDomFolder(domFile))
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

const upGrid = document.getElementById('drop-grid')

document.ondragenter = (e) => {
  if (isPicMode()) { return }
  cancelDefault(e)
  e.dataTransfer.dropEffect = 'copy'
  upGrid.style.display = 'flex'
}

upGrid.ondragleave = (e) => {
  cancelDefault(e)
  upGrid.style.display = 'none'
}

document.ondragover = (e) => {
  cancelDefault(e)
  return false
}

document.ondrop = (e) => {
  cancelDefault(e)
  upGrid.style.display = 'none'

  Array.from(e.dataTransfer.items).forEach(pushEntry)
  return false
}

let totalUploads = 0
let totalDone = 0

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
  const hrefSelected = window.localStorage.getItem('last-selected' + location.href)
  let a = allA.find(el => el.href === hrefSelected)

  if (!a) {
    if (allA[0].innerText === '../') {
      a = allA[1]
    } else {
      a = allA[0]
    }
  }

  const icon = a.parentElement.parentElement.querySelectorAll('.arrow-icon')[0]
  icon.classList.add('arrow-selected')
  scrollToArrow()
}

const storeLastArrowSrc = src => window.localStorage.setItem('last-selected' + location.href, src)

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

function setCursorToClosest () {
  const a = allA.find(el => el.innerText.toLocaleLowerCase().startsWith(path))
  if (!a) { return }
  storeLastArrowSrc(a.href)
  restoreCursorPos()
}

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

function nextPage () {
  const a = getASelected()
  if (!a.href || !a.innerText.endsWith('/')) { return }
  browseTo(a.href)
}

function prevPage () {
  browseTo(window.location.href + "../")
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

let path = ''
let clearPathToken = null

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

    case 'ArrowRight':
      e.preventDefault()
      return picsOn(true) || picsNav(true) || nextPage()

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
        return isPicMode() || mkdir()

      case 'KeyC':
        e.preventDefault()
        return isPicMode() || cpPath()
    }
  }

  // Any other key, for text search
  if (e.code.includes('Key')) {
    path += e.code.replace('Key', '').toLocaleLowerCase()
    window.clearTimeout(clearPathToken)
    clearPathToken = setTimeout(() => { path = '' }, 1000)
    setCursorToClosest()
  }
}, false)

function partialBrowseOnClickFolders () {
  allA.forEach(a => {
    if (!a.innerText.endsWith('/')) { return }
    a.addEventListener('click', e => {
      e.preventDefault()
      storeLastArrowSrc(e.target.href)
      browseTo(e.target.href)
    })
  }, false)
}

function init () {
  allA = Array.from(document.querySelectorAll('a'))
  allImgs = allA.map(el => el.href).filter(isPic)
  document.getElementById('picsToggle').style.display = allImgs.length > 0 ? 'flex' : 'none'

  imgsIndex = 0
  partialBrowseOnClickFolders()
  restoreCursorPos()
  console.log('Browsed to ' + location.href)
}

init()

window.picsToggle = picsToggle
window.picsNav = () => picsNav(true)
window.mkdir = mkdir
