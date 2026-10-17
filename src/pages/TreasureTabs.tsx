import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BackHeader, StatusChip, stateLabel } from '../components/Common'
import { ChestArt, TreasureArt, WaxSeal } from '../components/Art'
import { LockIcon } from '../components/Icons'
import { acquiredCount, areaCounts, progressOf, useGame, type Treasure, type TreasureState } from '../lib/game'
import { errorMessage } from '../lib/supabase'

function linkFor(t: Treasure, st: TreasureState) {
  if (st === 'acquired') return `/got/${t.id}`
  if (st === 'found') return `/found/${t.id}`
  return `/puzzle/${t.id}`
}

export function Collection() {
  const { me, content } = useGame()
  const [filter, setFilter] = useState<string>('all')
  const areas = content.areas.filter((a) => filter === 'all' || a.id === filter)
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
          {content.areas.map((a) => (
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
  }, [cleared, me.player, me.redeemed, slot, issueCertificate])

  return (
    <div className="screen">
      <div className="page stack-14">
        <BackHeader title="クリア証明" to="/home" />
        {cleared && me.player ? (
          <>
            <section className="cert">
              <span className="cert-shine" aria-hidden="true" />
              <span className="cert-kicker">渋川からの挑戦状</span>
              <h2 className="cert-title">達成状</h2>
              <p className="cert-who">
                {me.player.nickname} 殿
                <small>
                  参加者 No.{me.player.player_no}・お宝 {got} / {content.treasures.length}
                </small>
              </p>
              <div className="cert-qr">
                {me.redeemed ? (
                  <span className="qr-done">受取済み</span>
                ) : qr ? (
                  <img src={qr} alt="受取用QRコード" width={168} height={168} />
                ) : (
                  <span className="qr-ph" />
                )}
              </div>
              <p className="cert-clock">
                <span className="live-dot" aria-hidden="true" />
                {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
              </p>
              <WaxSeal className="art-wax cert-wax" letter={me.redeemed ? '済' : '証'} />
            </section>
            {err && <p className="form-msg">{err}</p>}
            <section className="glass panel row-12">
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
          <section className="glass panel center stack-12 cert-locked">
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
