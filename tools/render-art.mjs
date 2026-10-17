// お宝の絵（src/art/svgArt.js）を Unity 用の PNG にする。
//   node --experimental-websocket tools/render-art.mjs
// Google Chrome（headless）を DevTools Protocol で動かして、透明背景で 512px に書き出す。
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TREASURE_KINDS, treasureSvg } from '../src/art/svgArt.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'unity/Assets/Resources/Treasures')
mkdirSync(out, { recursive: true })
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9339
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, '--hide-scrollbars', `--user-data-dir=${join(tmpdir(), 'render-art')}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let tabs
for (let i = 0; i < 60 && !tabs; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json() } catch { await sleep(250) } }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id) }
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })

await send('Emulation.setDeviceMetricsOverride', { width: 512, height: 512, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
for (const kind of TREASURE_KINDS) {
  // 少し内側に余白を取り、影（drop-shadow）が切れないようにする
  const html = `<html><body style="margin:0;background:transparent"><div style="width:512px;height:512px;display:grid;place-items:center;filter:drop-shadow(0 10px 14px rgba(0,0,0,.28))">${treasureSvg('u', kind, 430)}</div></body></html>`
  await send('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(html).toString('base64') })
  await sleep(400)
  const r = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(out, `${kind}.png`), Buffer.from(r.result.data, 'base64'))
  console.log('wrote', kind)
}
ws.close()
chrome.kill()
