import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { useGame } from '../lib/game'
import { errorMessage } from '../lib/supabase'
import { staff } from './staff'

interface Code {
  treasure_id: string
  token: string
  short_code: string
}

export function treasureUrl(token: string) {
  return `${window.location.origin}${window.location.pathname}#/t/${token}`
}

export default function QrPrint() {
  const { content } = useGame()
  const [codes, setCodes] = useState<Code[]>([])
  const [imgs, setImgs] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Set<string>>(() => new Set(content.treasures.map((t) => t.id)))
  const [err, setErr] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    staff<Code[]>('staff_qr_codes')
      .then(async (list) => {
        const pairs = await Promise.all(list.map(async (c) => [c.treasure_id, await QRCode.toDataURL(treasureUrl(c.token), { margin: 1, width: 300 })] as const))
        if (!alive) return
        setCodes(list)
        setImgs(Object.fromEntries(pairs))
      })
      .catch((e) => alive && setErr(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [tick])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const area = (id: string) => content.areas.find((a) => a.id === id)?.short_name ?? ''
  const list = content.treasures.filter((t) => selected.has(t.id))

  return (
    <div className="stack-24">
      <header className="between wrap no-print">
        <h1 className="h1">QR印刷</h1>
        <button type="button" className="btn btn-deep" onClick={() => window.print()}>
          印刷する（PDF保存も可）
        </button>
      </header>
      {err && <p className="form-msg no-print">{err}</p>}
      <div className="admin-cols">
        <section className="admin-card stack-4 col-narrow no-print">
          <h2 className="card-title">印刷するお宝</h2>
          {content.treasures.map((t) => (
            <div key={t.id} className="check line">
              <input id={`qr-${t.id}`} type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
              <label htmlFor={`qr-${t.id}`} className="grow">
                <span className="muted">{t.no}</span> {t.name} <span className="small muted">{area(t.area_id)}</span>
              </label>
              <button
                type="button"
                className="btn btn-text small-btn"
                onClick={async () => {
                  if (!confirm(`No.${t.no} のQRを再発行しますか？今貼ってあるQRは使えなくなります。`)) return
                  try {
                    await staff('staff_reissue_qr', { p_treasure: t.id })
                    setTick((n) => n + 1)
                  } catch (e) {
                    setErr(errorMessage(e))
                  }
                }}
              >
                再発行
              </button>
            </div>
          ))}
          <p className="small muted lh">
            QRを読むと、このサイトのお宝ページが開きます。防水ラミネートしてポールに付け、下の6桁コードも見えるようにしてください。獲得の謎の答え（合言葉など）は別の札で現地に置きます。
          </p>
        </section>
        <section className="print-sheet col">
          {list.map((t) => {
            const c = codes.find((x) => x.treasure_id === t.id)
            return (
              <div key={t.id} className="print-label">
                {imgs[t.id] ? <img src={imgs[t.id]} alt={`No.${t.no}のQRコード`} /> : <span className="qr-ph" />}
                <b className="print-code">{c?.short_code ?? '------'}</b>
                <span className="small">
                  No.{t.no} {area(t.area_id)}
                </span>
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}
