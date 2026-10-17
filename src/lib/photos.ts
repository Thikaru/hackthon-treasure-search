// 思い出の写真（お宝を獲得した場所で撮る）。この端末の中（IndexedDB）だけに保存し、サーバーには送らない。
// 画像は保存前に長い辺 1024px の JPEG に縮める（スマホのメモリと保存容量を節約）。
import { useEffect, useState } from 'react'

export interface Photo {
  treasureId: string
  url: string
  takenAt: number
}

interface Stored {
  treasureId: string
  blob: Blob
  takenAt: number
}

const DB = 'ts-memories'
const STORE = 'photos'
const MAX_SIDE = 1024

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'treasureId' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const r = run(db.transaction(STORE, mode).objectStore(STORE))
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

// ---- 画面に配る（保存・削除のたびに作り直す） ----
let cache: Record<string, Photo> = {}
let loaded = false
const listeners = new Set<(p: Record<string, Photo>) => void>()

function publish(next: Record<string, Photo>) {
  Object.values(cache).forEach((p) => {
    if (next[p.treasureId]?.url !== p.url) URL.revokeObjectURL(p.url)
  })
  cache = next
  listeners.forEach((f) => f(cache))
}

async function load() {
  try {
    const rows = await tx<Stored[]>('readonly', (s) => s.getAll() as IDBRequest<Stored[]>)
    publish(Object.fromEntries(rows.map((r) => [r.treasureId, { treasureId: r.treasureId, takenAt: r.takenAt, url: URL.createObjectURL(r.blob) }])))
  } catch {
    // 保存が使えない（プライベートブラウズなど）ときは、写真なしで遊べる
    publish({})
  }
}

/** 撮った写真の一覧（treasureId → 写真） */
export function usePhotos(): Record<string, Photo> {
  const [photos, setPhotos] = useState(cache)
  useEffect(() => {
    listeners.add(setPhotos)
    if (!loaded) {
      loaded = true
      load()
    } else setPhotos(cache)
    return () => void listeners.delete(setPhotos)
  }, [])
  return photos
}

/** カメラで撮った（選んだ）画像を縮めて保存する */
export async function savePhoto(treasureId: string, file: Blob): Promise<void> {
  const blob = await shrink(file)
  const takenAt = Date.now()
  try {
    await tx('readwrite', (s) => s.put({ treasureId, blob, takenAt } satisfies Stored))
  } catch {
    // 保存できなくても、この画面の間は見られるようにする
  }
  publish({ ...cache, [treasureId]: { treasureId, takenAt, url: URL.createObjectURL(blob) } })
}

export async function deletePhoto(treasureId: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(treasureId))
  } catch {
    // 消せなくても表示からは外す
  }
  const next = { ...cache }
  delete next[treasureId]
  publish(next)
}

/** ログアウトしたら消す（次にこの端末を使う人に見えないように） */
export async function clearPhotos(): Promise<void> {
  try {
    await tx('readwrite', (s) => s.clear())
  } catch {
    // 何もしない
  }
  publish({})
}

async function shrink(file: Blob): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * k)
    const h = Math.round(img.naturalHeight * k)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.82))
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const timeLabel = (ms: number) => {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
