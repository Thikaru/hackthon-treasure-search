import { useState, type FormEvent } from 'react'
import QrScanner from '../components/QrScanner'
import { useGame } from '../lib/game'
import { errorMessage } from '../lib/supabase'
import { fmtDate, staff } from './staff'

interface Verify {
  valid: boolean
  reason: string | null
  player_no?: number
  nickname?: string
  status?: string
  count?: number
  total?: number
  clear_count?: number
  redeemed_at?: string | null
}

export default function Redeem() {
  const { content } = useGame()
  const [token, setToken] = useState('')
  const [v, setV] = useState<Verify | null>(null)
  const [err, setErr] = useState('')
  const [manual, setManual] = useState('')
  const [scanOn, setScanOn] = useState(true)
  const [done, setDone] = useState(false)

  async function check(text: string) {
    const t = text.trim().replace(/^TKNZ2\|/, '')
    if (!t) return
    setErr('')
    setDone(false)
    try {
      const r = await staff<Verify>('staff_verify_certificate', { p_token: t })
      setToken(t)
      setV(r)
    } catch (e) {
      setErr(errorMessage(e))
    }
  }

  function submitManual(e: FormEvent) {
    e.preventDefault()
    check(manual)
  }

  async function redeem() {
    try {
      const r = await staff<{ ok: boolean; reason?: string }>('staff_redeem', { p_token: token })
      if (r.ok) {
        setDone(true)
        await check(token)
      } else {
        setErr(
          r.reason === 'expired'
            ? 'QRの有効期限が切れました。参加者の画面でもう一度読み取ってください'
            : r.reason === 'already'
              ? 'すでに受取済みです'
              : r.reason === 'not_cleared'
                ? 'クリア条件を満たしていません'
                : '受取にできませんでした',
        )
      }
    } catch (e) {
      setErr(errorMessage(e))
    }
  }

  const meets = v ? (v.count ?? 0) >= (v.clear_count ?? 0) : false
  const already = !!v?.redeemed_at
  const disabled = v?.status === 'disabled'
  const canGive = v && v.valid && meets && !already && !disabled

  return (
    <div className="stack-24">
      <h1 className="h1">景品受取</h1>
      <div className="admin-cols">
        <section className="admin-card stack-14 col">
          <div className="between">
            <h2 className="card-title">参加者の証明QRを読む</h2>
            <button type="button" className="btn btn-text small-btn" onClick={() => setScanOn((s) => !s)}>
              {scanOn ? 'カメラを止める' : 'カメラを起動'}
            </button>
          </div>
          {scanOn ? <QrScanner onResult={check} cooldownMs={4000} /> : <div className="scanner off">カメラ停止中</div>}
          <form className="stack-8" onSubmit={submitManual}>
            <label htmlFor="manual" className="small bold">
              QRが読めないとき：証明QRの内容を貼り付け
            </label>
            <div className="row-8">
              <input id="manual" className="input" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="TKNZ2|…" />
              <button type="submit" className="btn btn-deep btn-answer">
                確認
              </button>
            </div>
          </form>
        </section>

        <section className={'admin-card stack-14 col' + (v ? (canGive || done ? ' result-ok' : ' result-ng') : '')} aria-live="polite">
          <h2 className="card-title">読み取り結果</h2>
          {!v && !err && <p className="muted">参加者の「お宝 › クリア証明」画面のQRを読み取ってください。</p>}
          {err && <p className="form-msg">{err}</p>}
          {v && v.reason === 'unknown' && <p className="form-msg">このQRは見つかりません。参加者の画面を開き直してもらってください。</p>}
          {v && v.nickname && (
            <>
              <div className="row-12 baseline">
                <span className="cert-name dark">{v.nickname}</span>
                <span className="muted">No. {v.player_no}</span>
              </div>
              <div className="stat-grid">
                <div className="stat">
                  <span>獲得数</span>
                  <b>
                    {v.count} / {v.total}
                  </b>
                </div>
                <div className={'stat ' + (meets ? 'good' : 'bad')}>
                  <span>クリア条件</span>
                  <b>{meets ? '達成' : '未達成'}</b>
                </div>
                <div className={'stat ' + (already ? 'good' : 'warn')}>
                  <span>景品</span>
                  <b>{already ? '受取済み' : '未受取'}</b>
                </div>
              </div>
              {!v.valid && v.reason === 'expired' && (
                <p className="form-msg">このQRは期限切れです（スクリーンショットの可能性）。本人の画面でもう一度読み取ってください。</p>
              )}
              {disabled && <p className="form-msg">この参加者は無効化されています。</p>}
              {already && v.redeemed_at && <p className="form-msg">{fmtDate(v.redeemed_at)} に受取済みです。二重受取はできません。</p>}
              {done && <p className="ok-msg">受取済みにしました。景品をお渡しください。</p>}
              {content.settings.prizeName && (
                <p>
                  渡す景品：<b>{content.settings.prizeName}</b>
                </p>
              )}
              <button type="button" className="btn btn-primary btn-lg" disabled={!canGive} onClick={redeem}>
                受取済みにする
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
