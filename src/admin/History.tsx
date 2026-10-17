import { useEffect, useState } from 'react'
import { errorMessage } from '../lib/supabase'
import { fmtDate, staff } from './staff'

interface Row {
  player_no: number
  nickname: string
  count: number
  prize: string
  redeemed_at: string
}

export default function History() {
  const [list, setList] = useState<Row[]>([])
  const [err, setErr] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    staff<Row[]>('staff_redemptions')
      .then(setList)
      .catch((e) => setErr(errorMessage(e)))
  }, [tick])

  function downloadCsv() {
    const rows = [['受取日時', '参加者No', 'ニックネーム', '獲得数', '景品'], ...list.map((r) => [r.redeemed_at, String(r.player_no), r.nickname, String(r.count), r.prize])]
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'redemptions.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="stack-24">
      <header className="between wrap">
        <h1 className="h1">受取履歴</h1>
        <button type="button" className="btn btn-outline" onClick={downloadCsv} disabled={list.length === 0}>
          CSVで保存
        </button>
      </header>
      {err && <p className="form-msg">{err}</p>}
      <p className="muted">合計 {list.length} 件（すべての受付端末の記録）</p>
      <section className="admin-card">
        {list.length === 0 ? (
          <p className="muted">まだ受取はありません</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>受取日時</th>
                  <th>参加者No</th>
                  <th>ニックネーム</th>
                  <th>獲得数</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.player_no}>
                    <td>{fmtDate(r.redeemed_at)}</td>
                    <td>{r.player_no}</td>
                    <td className="bold">{r.nickname}</td>
                    <td>{r.count}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-text danger small-btn"
                        onClick={async () => {
                          if (!confirm(`No.${r.player_no} の受取記録を取り消しますか？`)) return
                          try {
                            await staff('staff_undo_redemption', { p_player_no: r.player_no })
                            setTick((n) => n + 1)
                          } catch (e) {
                            setErr(errorMessage(e))
                          }
                        }}
                      >
                        取り消し
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
