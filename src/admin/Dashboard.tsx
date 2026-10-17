import { useEffect, useState } from 'react'
import { useGame } from '../lib/game'
import { errorMessage } from '../lib/supabase'
import { staff } from './staff'

interface Dash {
  players: number
  players_today: number
  cleared: number
  redeemed: number
  treasures: { id: string; no: string; name: string; area_id: string; located: number; found: number; acquired: number }[]
}

export default function Dashboard() {
  const { content } = useGame()
  const [d, setD] = useState<Dash | null>(null)
  const [err, setErr] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    staff<Dash>('staff_dashboard')
      .then(setD)
      .catch((e) => setErr(errorMessage(e)))
    const t = setInterval(() => setTick((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [tick])

  const area = (id: string) => content.areas.find((a) => a.id === id)?.short_name ?? id

  return (
    <div className="stack-24">
      <header className="between wrap">
        <h1 className="h1">ダッシュボード</h1>
        <button type="button" className="btn btn-outline small-btn" onClick={() => setTick((n) => n + 1)}>
          更新
        </button>
      </header>
      {err && <p className="form-msg">{err}</p>}
      {d && (
        <>
          <div className="kpi-grid">
            <div className="admin-card kpi">
              <span>参加者数</span>
              <b>{d.players}</b>
              <small>本日 {d.players_today} 人</small>
            </div>
            <div className="admin-card kpi">
              <span>クリア人数</span>
              <b>{d.cleared}</b>
              <small>参加者の {d.players ? Math.round((d.cleared / d.players) * 100) : 0}%</small>
            </div>
            <div className="admin-card kpi">
              <span>景品受取済み</span>
              <b>{d.redeemed}</b>
            </div>
            <div className="admin-card kpi">
              <span>未受取のクリア者</span>
              <b className="warn-text">{Math.max(0, d.cleared - d.redeemed)}</b>
              <small>受付への案内が必要</small>
            </div>
          </div>
          <section className="admin-card stack-12">
            <h2 className="card-title">お宝ごとの状況</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>お宝</th>
                    <th>エリア</th>
                    <th>場所判明</th>
                    <th>発見</th>
                    <th>獲得</th>
                    <th style={{ width: 180 }}>発見→獲得</th>
                  </tr>
                </thead>
                <tbody>
                  {d.treasures.map((t) => {
                    const rate = t.found ? t.acquired / t.found : 0
                    const low = t.found >= 5 && rate < 0.5
                    return (
                      <tr key={t.id} className={low ? 'row-warn' : ''}>
                        <td>{t.no}</td>
                        <td className="bold">{t.name}</td>
                        <td>{area(t.area_id)}</td>
                        <td>{t.located}</td>
                        <td>{t.found}</td>
                        <td>{t.acquired}</td>
                        <td>
                          <div className="bar">
                            <span className={'bar-fill' + (low ? ' warn' : '')} style={{ width: `${rate * 100}%` }} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="small muted">オレンジの行：発見したのに獲得の謎で止まっている人が多いお宝（ヒントや難易度の見直し候補）。30秒ごとに自動更新します。</p>
          </section>
        </>
      )}
    </div>
  )
}
