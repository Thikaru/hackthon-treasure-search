// Unity（unity/ プロジェクト）で描く「宝箱・お宝」の舞台。
// ページを移っても作り直さないよう、キャンバスと Unity は1つだけ作って使い回す。
// Unity が読み込めない端末でも遊べるよう、失敗したら画面側は SVG の宝箱に戻る。

export type StageScene = 'chest' | 'reveal'
export type TimeOfDay = 'day' | 'dusk' | 'night'
export type StageStatus = 'idle' | 'loading' | 'ready' | 'failed'

interface UnityInstance {
  SendMessage: (obj: string, method: string, arg?: string | number) => void
}

declare global {
  interface Window {
    createUnityInstance?: (canvas: HTMLCanvasElement, config: Record<string, unknown>) => Promise<UnityInstance>
    TreasureStageNotify?: (message: string) => void
  }
}

import { UNITY_BUILD_VERSION } from './unityVersion'

const BASE = `${import.meta.env.BASE_URL}unity/`
const BUILD = `${BASE}Build/`
const V = `?v=${UNITY_BUILD_VERSION}`

let canvas: HTMLCanvasElement | null = null
let instance: UnityInstance | null = null
let status: StageStatus = 'idle'
let loading: Promise<void> | null = null
let lastScene = ''
const statusListeners = new Set<(s: StageStatus) => void>()
const messageListeners = new Set<(m: string) => void>()

function setStatus(s: StageStatus) {
  status = s
  statusListeners.forEach((f) => f(s))
}

export const stageStatus = () => status

export function onStageStatus(f: (s: StageStatus) => void) {
  statusListeners.add(f)
  return () => void statusListeners.delete(f)
}

/** Unity からの合図（"unlocked" / "revealed"）を受け取る */
export function onStageMessage(f: (m: string) => void) {
  messageListeners.add(f)
  return () => void messageListeners.delete(f)
}

/** 置き場所のないときにキャンバスを待たせておく箱（画面外） */
function parking() {
  let el = document.getElementById('unity-parking')
  if (!el) {
    el = document.createElement('div')
    el.id = 'unity-parking'
    el.setAttribute('aria-hidden', 'true')
    el.style.cssText = 'position:fixed;left:-10000px;top:0;width:300px;height:300px;overflow:hidden;pointer-events:none'
    document.body.appendChild(el)
  }
  return el
}

export function stageCanvas(): HTMLCanvasElement {
  if (!canvas) {
    canvas = document.createElement('canvas')
    // Unity は '#' + id でキャンバスを探すので id が必要
    canvas.id = 'treasure-stage-canvas'
    canvas.className = 'unity-canvas'
    canvas.tabIndex = -1
    // Unity は不透明な WebGL を作るので、写真背景を透かすため alpha 付きで作らせる
    const getCtx = canvas.getContext.bind(canvas) as (type: string, attrs?: object) => RenderingContext | null
    ;(canvas as unknown as { getContext: (type: string, attrs?: object) => RenderingContext | null }).getContext = (type, attrs) =>
      getCtx(type, { ...attrs, alpha: true, premultipliedAlpha: true, antialias: true })
    parking().appendChild(canvas)
  }
  return canvas
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('unity loader failed'))
    document.head.appendChild(s)
  })
}

/** 何度呼んでもよい。初回だけ読み込みを始める */
export function loadStage(): Promise<void> {
  if (loading) return loading
  // WebGL2 が使えない端末は最初から SVG の宝箱で表示する
  const probe = document.createElement('canvas')
  if (!probe.getContext('webgl2')) {
    setStatus('failed')
    loading = Promise.resolve()
    return loading
  }
  setStatus('loading')
  const cv = stageCanvas()
  window.TreasureStageNotify = (m: string) => {
    if (m === 'ready') setStatus('ready')
    messageListeners.forEach((f) => f(m))
  }
  loading = loadScript(`${BUILD}WebGL.loader.js${V}`)
    .then(() =>
      window.createUnityInstance!(cv, {
        dataUrl: `${BUILD}WebGL.data.unityweb${V}`,
        frameworkUrl: `${BUILD}WebGL.framework.js.unityweb${V}`,
        codeUrl: `${BUILD}WebGL.wasm.unityweb${V}`,
        streamingAssetsUrl: `${BASE}StreamingAssets`,
        companyName: 'aipapagames',
        productName: 'TreasureStage',
        productVersion: '0.1.0',
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      }),
    )
    .then((u) => {
      instance = u
      // "ready" が先に届かなかった場合に備える
      if (status !== 'ready') window.setTimeout(() => status === 'loading' && setStatus('ready'), 1500)
    })
    .catch(() => setStatus('failed'))
  return loading
}

function send(payload: Record<string, unknown>) {
  instance?.SendMessage('Bridge', 'Command', JSON.stringify({ cmd: '', scene: 'chest', tod: 'day', kind: 'gem', fresh: false, dx: 0, ...payload }))
}

/** 場面を切り替える（同じ場面を2回送らない。ページの再描画で演出がやり直しにならないように） */
export function showScene(scene: StageScene, opts: { tod: TimeOfDay; kind: string; fresh?: boolean; key: string }) {
  if (status !== 'ready') return
  if (lastScene === opts.key) return
  lastScene = opts.key
  send({ scene, tod: opts.tod, kind: opts.kind, fresh: !!opts.fresh })
}

export const stageTap = () => send({ cmd: 'tap' })
export const stageWrong = () => send({ cmd: 'wrong' })
export const stageUnlock = () => send({ cmd: 'unlock' })
export const stageDrag = (dx: number) => send({ cmd: 'drag', dx })
export const stageRelease = () => send({ cmd: 'release' })

/** 画面から外れたら描画を止め、次に別の場面を出せるよう記録を消す */
export function sleepStage() {
  lastScene = ''
  send({ cmd: 'sleep' })
  if (canvas) parking().appendChild(canvas)
}

export function wakeStage(host: HTMLElement) {
  host.appendChild(stageCanvas())
  send({ cmd: 'wake' })
}
