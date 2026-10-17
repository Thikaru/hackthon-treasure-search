import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useGame, type GuidepostMode } from '../lib/game'
import { errorMessage } from '../lib/supabase'
import { staff } from './staff'
import type { StaffTreasure } from './TreasureEdit'

export default function TreasuresAdmin() {
  const { content } = useGame()
  const { settings } = content
  const location = useLocation()
  const saved = (location.state as { saved?: string } | null)?.saved ?? ''
  const [list, setList] = useState<StaffTreasure[] | null>(null)
  const [err, setErr] = useState('')
  const [showAnswers, setShowAnswers] = useState(false)

  useEffect(() => {
    staff<StaffTreasure[]>('staff_treasures')
      .then(setList)
      .catch((e) => setErr(errorMessage(e)))
  }, [])

  const activeCount = list?.filter((t) => t.active).length ?? content.treasures.length
  const area = (id: string) => content.areas.find((a) => a.id === id)?.short_name ?? id

  return (
    <div className="stack-24">
      <div className="admin-head">
        <h1 className="h1">お宝・謎</h1>
        <Link to="/admin/treasures/new" className="btn btn-deep">
          ＋ 新しい謎を追加
        </Link>
      </div>
      <p className="muted lh">
        クリア条件：{settings.clearCount} / {activeCount} 個　景品：{settings.prizeName || '（未設定）'}
        <br />
        「編集」から、問題文・正解・ヒント・場所のヒントを変更できます。正解は参加者の画面には送られません。
      </p>
      {saved && (
        <p className="admin-notice" role="status">
          {saved}
        </p>
      )}
      <GuidepostModeSetting initial={settings.guidepostMode} />
      <section className="admin-card stack-12">
        <div className="admin-head">
          <h2 className="card-title">謎の一覧</h2>
          <label className="row-8 small">
            <input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} />
            正解を表示する
          </label>
        </div>
        {err && <p className="form-msg">{err}</p>}
        {!list && !err && <p className="muted small">読み込み中…</p>}
        {list && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>お宝</th>
                  <th>エリア</th>
                  <th>宝の道標</th>
                  <th>鍵のかかった宝箱の謎</th>
                  <th>状態</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id} className={t.active ? '' : 'row-off'}>
                    <td>{t.no}</td>
                    <td className="bold">{t.name}</td>
                    <td>{area(t.area_id)}</td>
                    <td className="wrap-cell">
                      {t.locate_question}
                      <Answers list={t.locate_answers} show={showAnswers} />
                    </td>
                    <td className="wrap-cell">
                      {t.acquire_question}
                      <Answers list={t.acquire_answers} show={showAnswers} />
                    </td>
                    <td>{t.active ? <span className="chip chip-located">表示中</span> : <span className="chip chip-locked">非表示</span>}</td>
                    <td>
                      <Link to={`/admin/treasures/${t.id}`} className="btn btn-outline small-btn">
                        編集
                      </Link>
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

function Answers({ list, show }: { list: string[]; show: boolean }) {
  if (list.length === 0) return <span className="answer-line warn">正解が未登録です</span>
  return <span className="answer-line">正解：{show ? list.join(' ／ ') : `●●●（${list.length}件）`}</span>
}

const MODES: { value: GuidepostMode; label: string; desc: string }[] = [
  { value: 'sequential', label: '1つずつ表示（初期設定）', desc: '各エリアで、前の道標のお宝を獲得すると次の道標が現れます。順番に進めたいときに。' },
  { value: 'all', label: '全問表示', desc: '最初からすべての道標が見え、どれからでも挑戦できます。' },
]

function GuidepostModeSetting({ initial }: { initial: GuidepostMode }) {
  const [mode, setMode] = useState<GuidepostMode>(initial)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function change(next: GuidepostMode) {
    if (next === mode || busy) return
    setBusy(true)
    setMsg('')
    try {
      await staff('staff_set_setting', { p_key: 'guidepost_mode', p_value: next })
      setMode(next)
      setMsg('保存しました。参加者の画面には、次に開いたとき（再読み込み時）から反映されます。')
    } catch (e) {
      setMsg(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-card stack-12 narrow">
      <h2 className="card-title">宝の道標の表示方法</h2>
      <div className="stack-8" role="radiogroup" aria-label="宝の道標の表示方法">
        {MODES.map((m) => (
          <label key={m.value} className={'mode-option' + (mode === m.value ? ' on' : '')}>
            <input type="radio" name="guidepost-mode" value={m.value} checked={mode === m.value} disabled={busy} onChange={() => change(m.value)} />
            <span className="stack-4">
              <b>{m.label}</b>
              <span className="small muted">{m.desc}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="form-msg ok-tone" role="status" aria-live="polite">
        {msg}
      </p>
    </section>
  )
}
