import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { BackHeader, StatusChip, stateLabel } from '../components/Common'
import { ChestIcon, LockIcon, PinIcon } from '../components/Icons'
import { acquiredCount, areaCounts, progressOf, useGame, type Treasure, type TreasureState } from '../lib/game'
import { errorMessage } from '../lib/supabase'

function TreasureHeader() {
  const { me, content } = useGame()
  return (
    <>
      <BackHeader
        title="お宝"
        to="/home"
        right={
          <span className="num-cobalt bold">
            {acquiredCount(me)} / {content.treasures.length} 獲得
          </span>
        }
      />
      <nav className="segmented seg-lg" aria-label="お宝の表示切替">
        <NavLink to="/treasures" className={({ isActive }) => (isActive ? 'on' : '')}>
          コレクション
        </NavLink>
        <NavLink to="/certificate" className={({ isActive }) => (isActive ? 'on' : '')}>
          クリア証明
        </NavLink>
      </nav>
    </>
  )
}

function linkFor(t: Treasure, st: TreasureState) {
  if (st === 'acquired') return `/got/${t.id}`
  if (st === 'found') return `/found/${t.id}`
  return `/puzzle/${t.id}`
}

export function Collection() {
  const { me, content } = useGame()
  const [filter, setFilter] = useState<string>('all')
  const areas = content.areas.filter((a) => filter === 'all' || a.id === filter)

  return (
    <div className="screen">
      <div className="page stack-14">
        <TreasureHeader />
        <div className="chips" role="group" aria-label="エリアで絞り込み">
          <button type="button" aria-pressed={filter === 'all'} className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
            すべて
          </button>
          {content.areas.map((a) => (
            <button key={a.id} type="button" aria-pressed={filter === a.id} className={filter === a.id ? 'on' : ''} onClick={() => setFilter(a.id)}>
              {a.short_name}
            </button>
          ))}
        </div>
        <div className="legend">
          {(['locked', 'located', 'found', 'acquired'] as TreasureState[]).map((st) => (
            <span key={st}>
              <i className={`dot dot-${st}`} />
              {stateLabel(st)}
            </span>
          ))}
        </div>
        {areas.map((a) => {
          const c = areaCounts(me, content, a.id)
          return (
            <section key={a.id} className="stack-10">
              <h2 className="section-title between">
                <span>
                  {a.name}
                  {a.needs_car && <span className="tag">車推奨</span>}
                </span>
                <span className="num-cobalt">
                  {c.got} / {c.total}
                </span>
              </h2>
              <div className="grid-2">
                {content.treasures
                  .filter((t) => t.area_id === a.id)
                  .map((t) => {
                    const st = progressOf(me, t.id).state
                    return (
                      <Link key={t.id} to={linkFor(t, st)} className={`t-card t-${st}`}>
                        <span className={`t-icon t-icon-${st}`}>
                          {st === 'acquired' || st === 'found' ? <ChestIcon /> : st === 'located' ? <PinIcon /> : '?'}
                        </span>
                        <span className="t-text">
                          <span className="small muted">No.{t.no}</span>
                          <span className="t-name">{st === 'acquired' ? t.name : '？？？'}</span>
                          <span className={`t-state t-state-${st}`}>{st === 'found' ? '宝箱の謎へ' : stateLabel(st)}</span>
                        </span>
                      </Link>
                    )
                  })}
              </div>
            </section>
          )
        })}
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
  const { me, content, issueCertificate } = useGame()
  const now = useClock()
  const got = acquiredCount(me)
  const { clearCount, prizeName, receptionPlace } = content.settings
  const cleared = got >= clearCount
  const [qr, setQr] = useState('')
  const [err, setErr] = useState('')
  const slot = Math.floor(now.getTime() / REFRESH_MS) // 30秒ごとに新しい証明トークンを発行

  useEffect(() => {
    if (!cleared || !me.player || me.redeemed) return
    let alive = true
    issueCertificate()
      .then((c) => QRCode.toDataURL(`TKNZ2|${c.token}`, { margin: 1, width: 360, color: { dark: '#22406E', light: '#FFFFFF' } }))
      .then((url) => {
        if (!alive) return
        setQr(url)
        setErr('')
      })
      .catch((e) => alive && setErr(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [cleared, me.player, me.redeemed, slot, issueCertificate])

  return (
    <div className="screen">
      <div className="page stack-14">
        <TreasureHeader />
        {cleared && me.player ? (
          <>
            <section className="cert">
              <div className="cert-sweep" aria-hidden="true" />
              <div className="between full">
                <span className="cert-kicker">CLEAR</span>
                <span className="cert-clock">
                  <span className="live-dot" aria-hidden="true" />
                  {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
                </span>
              </div>
              <div className="cert-qr">
                {me.redeemed ? (
                  <span className="qr-done">受取済み</span>
                ) : qr ? (
                  <img src={qr} alt="受取用QRコード" width={180} height={180} />
                ) : (
                  <span className="qr-ph" />
                )}
              </div>
              <div className="center">
                <div className="cert-name">{me.player.nickname} さん</div>
                <div className="cert-id">参加者No. {me.player.player_no}</div>
              </div>
              <div className="cert-stats">
                <div>
                  <span>獲得数</span>
                  <b>
                    {got} / {content.treasures.length} 個
                  </b>
                </div>
                <div>
                  <span>クリア条件</span>
                  <b>達成</b>
                </div>
              </div>
            </section>
            {err && <p className="form-msg">{err}</p>}
            <section className="card row-12">
              <StatusChip state={me.redeemed ? 'acquired' : 'found'} />
              <span className="small">
                {me.redeemed
                  ? '景品は受け取り済みです。ご参加ありがとうございました！'
                  : `${receptionPlace}でこの画面をスタッフに見せてください。${prizeName ? `景品：${prizeName}` : ''}`}
              </span>
            </section>
            <p className="small muted">時計と光の動きは、スクリーンショットでないことの確認用です。QRは30秒ごとに新しくなります。</p>
          </>
        ) : (
          <section className="card center stack-12 cert-locked">
            <span className="locked-icon big">
              <LockIcon size={28} />
            </span>
            <h2 className="card-title">クリアまであと {clearCount - got} 個</h2>
            <p className="muted small">お宝を {clearCount} 個集めると、ここに景品と交換できる「クリア証明」が表示されます。</p>
            <div className="bar">
              <span className="bar-fill" style={{ width: `${Math.min(100, (got / clearCount) * 100)}%` }} />
            </div>
            <Link to="/home" className="btn btn-primary">
              地図でお宝をさがす
            </Link>
          </section>
        )}
      </div>
    </div>
  )
}
