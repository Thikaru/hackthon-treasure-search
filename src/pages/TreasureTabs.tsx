import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BackHeader, Sparkles, stateLabel } from '../components/Common'
import { ChestArt, TreasureArt } from '../components/Art'
import { LockIcon } from '../components/Icons'
import { CameraIcon, PhotoCapture } from '../components/Memories'
import { acquiredCount, areaCounts, clearTime, formatDuration, progressOf, useGame, type Treasure, type TreasureState } from '../lib/game'
import { usePhotos } from '../lib/photos'
import { errorMessage } from '../lib/supabase'

function linkFor(t: Treasure, st: TreasureState) {
  if (st === 'acquired') return `/got/${t.id}`
  if (st === 'found') return `/found/${t.id}`
  return `/puzzle/${t.id}`
}

export function Collection() {
  const { me, content } = useGame()
  const [filter, setFilter] = useState<string>('all')
  // 飾り棚に出すのは「渋川」「王子ヶ岳」だけ（たまの湯は出さない。ホームのタブと同じ）
  const shown = content.areas.filter((a) => a.id !== 'spotB')
  const areas = shown.filter((a) => filter === 'all' || a.id === filter)
  const got = acquiredCount(me)
  const clearCount = content.settings.clearCount

  return (
    <div className="screen">
      <BackHeader title="お宝の飾り棚" to="/home" />
      <div className="page stack-14">
        <div className="seg glass seg-inline" role="group" aria-label="エリアで絞り込み">
          <button type="button" aria-pressed={filter === 'all'} className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
            すべて
          </button>
          {shown.map((a) => (
            <button key={a.id} type="button" aria-pressed={filter === a.id} className={filter === a.id ? 'on' : ''} onClick={() => setFilter(a.id)}>
              {a.short_name}
            </button>
          ))}
        </div>
        <div className="shelf-wrap">
          {areas.map((a) => {
            const c = areaCounts(me, content, a.id)
            return (
              <section key={a.id} className="shelf-area">
                <h2 className="shelf-label">
                  <span>
                    {a.name}
                    {a.needs_car && <span className="tag">車推奨</span>}
                  </span>
                  <span>
                    {c.got} / {c.total}
                  </span>
                </h2>
                <div className="shelf">
                  {content.treasures
                    .filter((t) => t.area_id === a.id)
                    .map((t) => {
                      const st = progressOf(me, t.id).state
                      return (
                        <Link key={t.id} to={linkFor(t, st)} className={`slot slot-${st}`} aria-label={`No.${t.no} ${st === 'acquired' ? t.name : stateLabel(st)}`}>
                          {st === 'acquired' ? (
                            <TreasureArt name={t.name} size={54} className="art-treasure slot-art" />
                          ) : st === 'found' ? (
                            <ChestArt size={64} className="art-chest slot-chest" />
                          ) : (
                            <span className="cloth">?</span>
                          )}
                          <small>{st === 'acquired' ? t.name : st === 'found' ? '宝箱の謎へ' : `No.${t.no}`}</small>
                        </Link>
                      )
                    })}
                </div>
              </section>
            )
          })}
        </div>
        <div className="coll-foot glass">
          <b>
            {got} / {clearCount}
          </b>
          <span className="meter">
            <i style={{ width: `${Math.min(100, (got / clearCount) * 100)}%` }} />
          </span>
          <small>{got >= clearCount ? 'クリア！' : `あと${clearCount - got}個でクリア`}</small>
        </div>
      </div>
    </div>
  )
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

const pad = (n: number) => String(n).padStart(2, '0')
const REFRESH_MS = 30000

export function Certificate() {
  const { me, content, refresh } = useGame()
  const got = acquiredCount(me)
  const { clearCount } = content.settings
  const cleared = got >= clearCount

  // クリア後、受付で読み取られる（受取済みになる）のを待つ。読み取られたら自動で達成状に切り替わる
  const waiting = cleared && !!me.player && !me.redeemed
  useEffect(() => {
    if (!waiting) return
    const t = setInterval(() => refresh().catch(() => undefined), 5000)
    return () => clearInterval(t)
  }, [waiting, refresh])

  if (!cleared || !me.player) {
    return (
      <div className="screen">
        <div className="page stack-14">
          <BackHeader title="クリア証明" to="/home" />
          <section className="glass panel center stack-12 cert-locked">
            <span className="locked-icon big">
              <LockIcon size={28} />
            </span>
            <h2 className="card-title">クリアまであと {clearCount - got} 個</h2>
            <p className="muted small">お宝を {clearCount} 個集めると、ここに受付で見せる「受取用のQR」が表示されます。</p>
            <div className="bar">
              <span className="bar-fill" style={{ width: `${Math.min(100, (got / clearCount) * 100)}%` }} />
            </div>
            <Link to="/home" className="btn btn-primary">
              地図でお宝をさがす
            </Link>
          </section>
        </div>
      </div>
    )
  }
  return me.redeemed ? <Award /> : <ClearQR />
}

/** 全部のお宝を見つけた：受付で見せる受取用QR（30秒ごとに新しくなる） */
function ClearQR() {
  const { me, content, issueCertificate } = useGame()
  const now = useClock()
  const ct = clearTime(me, content)
  const [qr, setQr] = useState('')
  const [err, setErr] = useState('')
  const slot = Math.floor(now.getTime() / REFRESH_MS)

  useEffect(() => {
    let alive = true
    issueCertificate()
      .then((c) => QRCode.toDataURL(`TKNZ2|${c.token}`, { margin: 1, width: 360, color: { dark: '#2a1c08', light: '#FFFFFF' } }))
      .then((url) => {
        if (!alive) return
        setQr(url)
        setErr('')
      })
      .catch((e) => alive && setErr(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [slot, issueCertificate])

  return (
    <div className="screen clear-screen">
      <div className="got-burst" aria-hidden="true" />
      <Sparkles count={20} seed={13} />
      <BackHeader title="" to="/home" />
      <div className="clr">
        <p className="clr-k">ALL CLEAR</p>
        <h1 className="clr-h small-h">全部のお宝を見つけた！</h1>
        {ct && (
          <div className="clr-time">
            <small>クリアタイム</small>
            <b>{formatDuration(ct.ms)}</b>
          </div>
        )}
        <div className="clr-qr">
          <div className="cert-qr">{qr ? <img src={qr} alt="受取用QRコード" width={190} height={190} /> : <span className="qr-ph" />}</div>
          <span className="clr-live">
            <s />
            {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
          </span>
        </div>
        {err && <p className="form-msg">{err}</p>}
        <p className="clr-note">
          {content.settings.receptionPlace}でスタッフにこのQRを見せてください。
          <br />
          読み取られると、この画面に「達成状」が届きます。
        </p>
      </div>
    </div>
  )
}

const CLEAR_PHOTO = { id: '__clear', no: '', name: 'クリアの記念写真' }

/** 受付で読み取られたあと：達成状（QRは出さない）。記念写真・スクショ用の表示ができる */
function Award() {
  const { me, content } = useGame()
  const ct = clearTime(me, content)
  const photo = usePhotos()[CLEAR_PHOTO.id]
  const [shoot, setShoot] = useState(false)
  const [shotMode, setShotMode] = useState(false)
  const [toast, setToast] = useState(false)
  const got = content.treasures.filter((t) => progressOf(me, t.id).state === 'acquired')
  const ymd = ct ? `${ct.end.getFullYear()}.${ct.end.getMonth() + 1}.${ct.end.getDate()}` : ''
  const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(false), 2000)
    return () => clearTimeout(t)
  }, [toast])

  const hide = () => {
    setShotMode(true)
    setToast(true)
  }
  const treasures = (size: number) => (
    <div className="aw-row">
      {got.map((t) => (
        <TreasureArt key={t.id} name={t.name} size={size} />
      ))}
    </div>
  )

  return (
    <div
      className={'screen award-screen' + (photo ? ' with-photo' : '') + (shotMode ? ' shot' : '')}
      onClick={() => {
        // スクショ用の表示中は、画面のどこをタップしてもボタンが戻る
        if (!shotMode) return
        setShotMode(false)
        setToast(false)
      }}
    >
      {photo ? (
        <div className="aw-photo" style={{ backgroundImage: `url(${photo.url})` }} aria-hidden="true" />
      ) : (
        <>
          <div className="beams aw-beams" aria-hidden="true" />
          <Sparkles count={24} seed={3} />
        </>
      )}
      {!shotMode && <BackHeader title="" to="/home" />}
      <div className="aw-top">
        <p className="clr-k">CONGRATULATIONS</p>
        <h1 className="clr-h">おめでとう！</h1>
      </div>

      {photo ? (
        <section className="aw-card">
          <div className="aw-card-l">
            <span className="aw-k">渋川からの挑戦状</span>
            <b className="aw-t sm">達 成 状</b>
            <em>{me.player!.nickname} 殿</em>
            {treasures(24)}
          </div>
          {ct && (
            <div className="aw-card-r">
              <small>クリアタイム</small>
              <b>{formatDuration(ct.ms)}</b>
              <span>{ymd}</span>
            </div>
          )}
        </section>
      ) : (
        <section className="award">
          <span className="cert-shine" aria-hidden="true" />
          <span className="aw-k">渋川からの挑戦状</span>
          <b className="aw-t">達 成 状</b>
          <em>{me.player!.nickname} 殿</em>
          <p>
            あなたは渋川の浜にかくれたお宝を見つけ出し
            <br />
            みごと挑戦をやりとげたことをここに証します
          </p>
          {treasures(34)}
          {ct && (
            <div className="aw-time">
              <small>クリアタイム</small>
              <b>{formatDuration(ct.ms)}</b>
              <span>
                {ymd}　{hm(ct.start)} → {hm(ct.end)}
              </span>
            </div>
          )}
          <span className="aw-stamp">受取済</span>
        </section>
      )}

      {!shotMode && (
        <div className="aw-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShoot(true)}>
            <CameraIcon />
            {photo ? '記念写真を撮り直す' : '記念写真を撮る'}
          </button>
          <button
            type="button"
            className="btn btn-glass aw-hide"
            onClick={(e) => {
              e.stopPropagation()
              hide()
            }}
          >
            {photo ? 'ボタンを隠してスクショ' : 'スクショ用に表示'}
          </button>
        </div>
      )}
      {toast && (
        <div className="aw-toast" role="status">
          画面をタップするとボタンが戻ります
        </div>
      )}
      <PhotoCapture treasure={CLEAR_PHOTO} open={shoot} onClose={() => setShoot(false)} note="達成状の背景になります" />
    </div>
  )
}
