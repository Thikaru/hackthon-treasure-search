import { useEffect, useState } from 'react'
import { errorMessage } from '../lib/supabase'
import { fmtDate, staff } from './staff'

interface Row {
  player_no: number
  nickname: string
  status: string
  created_at: string
  acquired: number
  redeemed: boolean
}

export default function Players() {
  const [list, setList] = useState<Row[]>([])
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    staff<Row[]>('staff_players')
      .then(setList)
      .catch((e) => setErr(errorMessage(e)))
  }, [tick])

  const shown = list.filter((r) => !q || r.nickname.includes(q) || String(r.player_no) === q.replace(/\D/g, ''))

  return (
    <div className="stack-24">
      <h1 className="h1">参加者</h1>
      {err && <p className="form-msg">{err}</p>}
      <input className="input narrow" type="search" aria-label="参加者を検索" placeholder="No・ニックネームで検索" value={q} onChange={(e) => setQ(e.target.value)} />
      <section className="admin-card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>No</th>
                <th>ニックネーム</th>
                <th>獲得数</th>
                <th>状態</th>
                <th>登録</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.player_no}>
                  <td>{r.player_no}</td>
                  <td className="bold">{r.nickname}</td>
                  <td>{r.acquired}</td>
                  <td>
                    {r.status === 'disabled' ? (
                      <span className="chip chip-locked">無効</span>
                    ) : r.redeemed ? (
                      <span className="chip chip-acquired">受取済み</span>
                    ) : (
                      <span className="chip chip-located">参加中</span>
                    )}
                  </td>
                  <td>{fmtDate(r.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-text small-btn"
                      onClick={async () => {
                        try {
                          await staff('staff_set_player_status', { p_player_no: r.player_no, p_status: r.status === 'disabled' ? 'active' : 'disabled' })
                          setTick((n) => n + 1)
                        } catch (e) {
                          setErr(errorMessage(e))
                        }
                      }}
                    >
                      {r.status === 'disabled' ? '有効に戻す' : '無効にする'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && <p className="muted">該当する参加者はいません</p>}
      </section>
    </div>
  )
}
