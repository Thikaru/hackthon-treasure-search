import { useState } from 'react'
import { useGame, type GuidepostMode } from '../lib/game'
import { errorMessage } from '../lib/supabase'
import { staff } from './staff'

export default function TreasuresAdmin() {
  const { content } = useGame()
  const { settings } = content
  return (
    <div className="stack-24">
      <h1 className="h1">お宝・謎</h1>
      <p className="muted lh">
        クリア条件：{settings.clearCount} / {content.treasures.length} 個　景品：{settings.prizeName || '（未設定）'}
        <br />
        内容の編集は Supabase の Table Editor で行います。問題文・ヒント・地図の位置は <code>public.treasures</code>、
        正解・場所ヒント（説明 <code>place_hint</code>・画像URL <code>place_image_url</code>）・QRトークンは <code>private.treasure_secrets</code>、クリア条件や景品名は <code>public.settings</code> です。
      </p>
      <GuidepostModeSetting initial={settings.guidepostMode} />
      <section className="admin-card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>No</th>
                <th>お宝</th>
                <th>エリア</th>
                <th>宝の道標</th>
                <th>宝箱の謎</th>
                <th>ヒント数</th>
              </tr>
            </thead>
            <tbody>
              {content.treasures.map((t) => (
                <tr key={t.id}>
                  <td>{t.no}</td>
                  <td className="bold">{t.name}</td>
                  <td>{content.areas.find((a) => a.id === t.area_id)?.short_name}</td>
                  <td className="wrap-cell">{t.locate_question}</td>
                  <td className="wrap-cell">{t.acquire_question}</td>
                  <td>
                    {t.locate_hints.length} / {t.acquire_hints.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
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
