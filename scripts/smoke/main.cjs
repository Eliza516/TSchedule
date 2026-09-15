/**
 * Renderer smoke test.
 *
 * Loads every built page against a stubbed `window.api`, walks each view, and
 * fails on any console error, dead render or missing markup. It needs no
 * database, so it runs anywhere `npm run build` does:
 *
 *   npm run build && npm run smoke
 *
 * Screenshots land in scripts/smoke/shots/ for a quick visual check.
 */
const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const OUT = path.join(__dirname, 'shots')
const RENDERER = path.join(__dirname, '..', '..', 'out', 'renderer')
const problems = []

app.commandLine.appendSwitch('no-sandbox')
app.disableHardwareAcceleration()

async function shoot(win, name) {
  const image = await win.webContents.capturePage()
  fs.writeFileSync(path.join(OUT, `${name}.png`), image.toPNG())
}

async function openPage(file, width, height) {
  const win = new BrowserWindow({
    width, height, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), sandbox: false, contextIsolation: true }
  })
  win.webContents.on('console-message', (event) => {
    if (event.level === 'error' || event.level === 3) problems.push(`[${file}] console: ${event.message}`)
  })
  win.webContents.on('render-process-gone', (_e, d) => problems.push(`[${file}] renderer gone: ${d.reason}`))
  win.webContents.on('preload-error', (_e, p, err) => problems.push(`[${file}] preload: ${err.message}`))
  await win.loadFile(path.join(RENDERER, file))
  await new Promise((r) => setTimeout(r, 900))
  return win
}

/** Clicks a sidebar item by its label and waits for the view to settle. */
async function navigate(win, label) {
  const found = await win.webContents.executeJavaScript(`
    (() => {
      const btn = [...document.querySelectorAll('.nav-item')].find((b) => b.textContent.includes(${JSON.stringify(label)}))
      if (!btn) return false
      btn.click()
      return true
    })()
  `)
  if (!found) problems.push(`[index.html] no sidebar item "${label}"`)
  await new Promise((r) => setTimeout(r, 600))
  return found
}

async function assertRendered(win, file, selector) {
  const count = await win.webContents.executeJavaScript(
    `document.querySelectorAll(${JSON.stringify(selector)}).length`
  )
  if (count === 0) problems.push(`[${file}] expected "${selector}" to render, found none`)
  return count
}

app.whenReady().then(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  try {
    const main = await openPage('index.html', 1280, 860)
    await assertRendered(main, 'index.html', '.task-row')
    await assertRendered(main, 'index.html', '.timer__clock')
    await shoot(main, '1-today')

    for (const [label, selector, shot] of [
      ['Week', '.week-col', '2-week'],
      ['Goals', '.goal-card', '3-goals'],
      ['Habits', '.streak-grid', '4-habits'],
      ['Stats', '.stat-tile', '5-stats'],
      ['Inbox', '.task-row', '6-inbox'],
      ['Settings', '.card', '7-settings']
    ]) {
      if (await navigate(main, label)) {
        await assertRendered(main, `index.html:${label}`, selector)
        await shoot(main, shot)
      }
    }

    const checkin = await openPage('checkin.html', 860, 760)
    await assertRendered(checkin, 'checkin.html', '.triage')
    await shoot(checkin, '8-checkin-evening')

    const capture = await openPage('capture.html', 680, 132)
    await assertRendered(capture, 'capture.html', '.capture__input')
    await shoot(capture, '9-capture')
  } catch (error) {
    problems.push(`harness: ${error.stack || error.message}`)
  }

  if (problems.length === 0) console.log('SMOKE_OK')
  else {
    console.log('SMOKE_PROBLEMS')
    for (const problem of problems) console.log(' -', problem)
  }
  app.exit(problems.length === 0 ? 0 : 1)
})
