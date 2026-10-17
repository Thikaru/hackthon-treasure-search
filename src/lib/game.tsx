// ゲームの状態（コンテンツ＋自分の進捗）を Supabase から読み込んで配るコンテキスト
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import * as demo from './demoState'

export type AreaId = string
export type TreasureState = 'locked' | 'located' | 'found' | 'acquired'
export type PuzzleKind = 'locate' | 'acquire'

export interface Area {
  id: AreaId
  name: string
  short_name: string
  description: string
  needs_car: boolean
  sort: number
}

export interface Treasure {
  id: string
  no: string
  area_id: AreaId
  name: string
  description: string
  pin_x: number
  pin_y: number
  locate_question: string
  locate_hints: string[]
  acquire_question: string
  acquire_hints: string[]
  sort: number
}

/** 宝の道標の表示方法：sequential＝1つずつ（初期値）／all＝全問 */
export type GuidepostMode = 'sequential' | 'all'

export interface Settings {
  guidepostMode: GuidepostMode
  title: string
  subtitle: string
  clearCount: number
  prizeName: string
  receptionPlace: string
  contact: string
}

export interface Player {
  player_no: number
  nickname: string
  transfer_code: string
  status: string
  created_at: string
}

export interface TreasureProgress {
  treasure_id: string
  state: TreasureState
  locate_hints: number
  acquire_hints: number
}

export interface Content {
  areas: Area[]
  treasures: Treasure[]
  settings: Settings
}

/** 宝の道標に正解した後に見られる場所ヒント（画像・説明とも任意） */
export interface PlaceHint {
  text: string | null
  image_url: string | null
}

interface MyState {
  player: Player | null
  progress: Record<string, TreasureProgress>
  placeHints: Record<string, PlaceHint>
  redeemed: boolean
}

interface GameCtx {
  content: Content
  me: MyState
  refresh: () => Promise<void>
  register: (nickname: string) => Promise<void>
  submitAnswer: (treasureId: string, kind: PuzzleKind, answer: string) => Promise<boolean>
  useHintFor: (treasureId: string, kind: PuzzleKind) => Promise<void>
  scan: (code: string) => Promise<{ ok: boolean; treasure_id?: string; state?: TreasureState }>
  issueCertificate: () => Promise<{ token: string; expires_at: string }>
  restore: (code: string) => Promise<boolean>
  leave: () => Promise<void>
}

const Ctx = createContext<GameCtx | null>(null)

const DEFAULT_SETTINGS: Settings = {
  guidepostMode: 'sequential',
  title: '渋川からの挑戦状',
  subtitle: '宝探し × 謎解き',
  clearCount: 6,
  prizeName: '',
  receptionPlace: '受付',
  contact: '',
}

async function loadContent(): Promise<Content> {
  const [a, t, s] = await Promise.all([
    supabase.from('areas').select('*').order('sort'),
    supabase.from('treasures').select('*').order('sort'),
    supabase.from('settings').select('*'),
  ])
  if (a.error) throw a.error
  if (t.error) throw t.error
  if (s.error) throw s.error
  const map = Object.fromEntries((s.data as { key: string; value: string }[]).map((r) => [r.key, r.value]))
  return {
    areas: a.data as Area[],
    treasures: t.data as Treasure[],
    settings: {
      guidepostMode: map.guidepost_mode === 'all' ? 'all' : 'sequential',
      title: map.title ?? DEFAULT_SETTINGS.title,
      subtitle: map.subtitle ?? DEFAULT_SETTINGS.subtitle,
      clearCount: Number(map.clear_count ?? DEFAULT_SETTINGS.clearCount),
      prizeName: map.prize_name ?? DEFAULT_SETTINGS.prizeName,
      receptionPlace: map.reception_place ?? DEFAULT_SETTINGS.receptionPlace,
      contact: map.contact ?? DEFAULT_SETTINGS.contact,
    },
  }
}

const EMPTY: MyState = { player: null, progress: {}, placeHints: {}, redeemed: false }

async function loadMe(): Promise<MyState> {
  const { data: sess } = await supabase.auth.getSession()
  if (!sess.session) return EMPTY
  const { data, error } = await supabase.rpc('get_my_state')
  if (error) throw error
  const d = data as { player: Player | null; progress: TreasureProgress[]; place_hints: Record<string, PlaceHint | string>; redeemed: boolean }
  return {
    player: d.player,
    progress: Object.fromEntries((d.progress ?? []).map((p) => [p.treasure_id, p])),
    // 旧形式（文字列）にも対応
    placeHints: Object.fromEntries(
      Object.entries(d.place_hints ?? {}).map(([k, v]) => [k, typeof v === 'string' ? { text: v || null, image_url: null } : v]),
    ),
    redeemed: !!d.redeemed,
  }
}

async function ensureSession() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}

/** 開発時のデモ（?demo=1 / ?demo=clear）。Supabase に触れずに全画面を確かめる */
const DEMO = import.meta.env.DEV ? new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('demo') ?? new URLSearchParams(window.location.search).get('demo') : null

function DemoProvider({ kind, children }: { kind: string; children: ReactNode }) {
  const [me, setMe] = useState<MyState>(() => ({ player: demo.demoPlayer, progress: demo.demoProgress(kind), placeHints: demo.demoHints, redeemed: false }))
  const set = (id: string, patch: Partial<TreasureProgress>) =>
    setMe((m) => ({ ...m, progress: { ...m.progress, [id]: { ...(m.progress[id] ?? { treasure_id: id, state: 'locked', locate_hints: 0, acquire_hints: 0 }), ...patch } } }))
  const value: GameCtx = {
    content: demo.demoContent,
    me,
    refresh: async () => undefined,
    register: async () => undefined,
    async submitAnswer(id, k, answer) {
      await new Promise((r) => setTimeout(r, 300))
      if (answer.trim() === 'まちがい') return false
      set(id, { state: k === 'locate' ? 'located' : 'acquired' })
      return true
    },
    async useHintFor(id, k) {
      const p = me.progress[id]
      set(id, k === 'locate' ? { locate_hints: (p?.locate_hints ?? 0) + 1 } : { acquire_hints: (p?.acquire_hints ?? 0) + 1 })
    },
    async scan() {
      set('t03', { state: 'found' })
      return { ok: true, treasure_id: 't03', state: 'found' }
    },
    issueCertificate: async () => ({ token: 'demo-' + Date.now(), expires_at: '' }),
    restore: async () => false,
    leave: async () => undefined,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function GameProvider({ children }: { children: ReactNode }) {
  return DEMO ? <DemoProvider kind={DEMO}>{children}</DemoProvider> : <LiveProvider>{children}</LiveProvider>
}

function LiveProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<Content | null>(null)
  const [me, setMe] = useState<MyState>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setError(null)
    Promise.all([loadContent(), loadMe()])
      .then(([c, m]) => {
        if (!alive) return
        setContent(c)
        setMe(m)
      })
      .catch((e) => alive && setError(String(e?.message ?? e)))
    return () => {
      alive = false
    }
  }, [attempt])

  const refresh = useCallback(async () => {
    setMe(await loadMe())
  }, [])

  const api = useMemo<Omit<GameCtx, 'content' | 'me'>>(
    () => ({
      refresh,
      async register(nickname) {
        await ensureSession()
        const { error: e } = await supabase.rpc('register_player', { p_nickname: nickname })
        if (e) throw e
        await refresh()
      },
      async submitAnswer(treasureId, kind, answer) {
        const { data, error: e } = await supabase.rpc('submit_answer', { p_treasure: treasureId, p_kind: kind, p_answer: answer })
        if (e) throw e
        const ok = !!(data as { ok: boolean }).ok
        if (ok) await refresh()
        return ok
      },
      async useHintFor(treasureId, kind) {
        const { error: e } = await supabase.rpc('use_hint', { p_treasure: treasureId, p_kind: kind })
        if (e) throw e
        await refresh()
      },
      async scan(code) {
        const { data, error: e } = await supabase.rpc('scan_treasure', { p_code: code })
        if (e) throw e
        const r = data as { ok: boolean; treasure_id?: string; state?: TreasureState }
        if (r.ok) await refresh()
        return r
      },
      async issueCertificate() {
        const { data, error: e } = await supabase.rpc('issue_certificate')
        if (e) throw e
        return data as { token: string; expires_at: string }
      },
      async restore(code) {
        await ensureSession()
        const { data, error: e } = await supabase.rpc('restore_player', { p_code: code })
        if (e) throw e
        await refresh()
        return !!data
      },
      async leave() {
        await supabase.auth.signOut()
        setMe(EMPTY)
      },
    }),
    [refresh],
  )

  if (error) {
    return (
      <div className="app-shell">
        <div className="screen center-screen">
          <p className="body">データを読み込めませんでした。電波の良い場所でもう一度お試しください。</p>
          <button type="button" className="btn btn-primary" onClick={() => setAttempt((n) => n + 1)}>
            再読み込み
          </button>
        </div>
      </div>
    )
  }
  if (!content) {
    return (
      <div className="app-shell">
        <div className="screen center-screen" role="status">
          <span className="spinner" aria-hidden="true" />
          <p className="muted">読み込み中…</p>
        </div>
      </div>
    )
  }
  return <Ctx.Provider value={{ content, me, ...api }}>{children}</Ctx.Provider>
}

export function useGame(): GameCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('GameProvider missing')
  return c
}

// ---- 集計ヘルパー ----

export function progressOf(me: MyState, id: string): TreasureProgress {
  return me.progress[id] ?? { treasure_id: id, state: 'locked', locate_hints: 0, acquire_hints: 0 }
}

export function acquiredCount(me: MyState) {
  return Object.values(me.progress).filter((p) => p.state === 'acquired').length
}

export function areaCounts(me: MyState, content: Content, areaId: AreaId) {
  const list = content.treasures.filter((t) => t.area_id === areaId)
  return { got: list.filter((t) => progressOf(me, t.id).state === 'acquired').length, total: list.length }
}

/**
 * そのエリアで今見えている宝の道標。
 * 全問表示モードなら全部。1つずつモードなら、お宝を獲得済みの道標＋並び順で最初の未獲得1問だけ。
 */
export function visibleGuideposts(me: MyState, content: Content, areaId: AreaId) {
  const list = content.treasures.filter((t) => t.area_id === areaId)
  if (content.settings.guidepostMode === 'all') return { visible: list, hiddenCount: 0 }
  const firstOpen = list.findIndex((t) => progressOf(me, t.id).state !== 'acquired')
  if (firstOpen < 0) return { visible: list, hiddenCount: 0 }
  // 並び順で最初の未獲得より後ろにある未解決は隠す（すでに解いた・QRで先に見つけたものは表示する）
  const visible = list.filter((t, i) => i <= firstOpen || progressOf(me, t.id).state !== 'locked')
  return { visible, hiddenCount: list.length - visible.length }
}

/** エリア内でいま挑戦中の道標（並び順で最初の未獲得のもの）。すべて獲得済みなら undefined */
export function currentGuidepost(me: MyState, content: Content, areaId: AreaId) {
  return content.treasures.find((t) => t.area_id === areaId && progressOf(me, t.id).state !== 'acquired')
}

export function isGuidepostVisible(me: MyState, content: Content, t: Treasure) {
  return visibleGuideposts(me, content, t.area_id).visible.some((x) => x.id === t.id)
}

// QRを読んだが未登録だったときに、登録後に戻るためのメモ
const PENDING = 'takara-nazo:pending-token'
export function setPendingToken(token: string) {
  try {
    sessionStorage.setItem(PENDING, token)
  } catch {
    /* noop */
  }
}
export function takePendingToken(): string | null {
  try {
    const t = sessionStorage.getItem(PENDING)
    sessionStorage.removeItem(PENDING)
    return t
  } catch {
    return null
  }
}
