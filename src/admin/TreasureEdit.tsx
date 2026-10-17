import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useGame, type Treasure } from '../lib/game'
import { errorMessage } from '../lib/supabase'
import { staff } from './staff'

/** 運営用RPC staff_treasures が返す1件（公開項目＋正解・場所ヒント） */
export interface StaffTreasure extends Treasure {
  active: boolean
  locate_answers: string[]
  acquire_answers: string[]
  place_hint: string
  place_image_url: string | null
  short_code: string | null
}

interface Form {
  area_id: string
  name: string
  description: string
  sort: string
  active: boolean
  locate_question: string
  locate_answers: string
  locate_hints: string
  place_hint: string
  place_image_url: string
  acquire_question: string
  acquire_answers: string
  acquire_hints: string
  pin_x: string
  pin_y: string
}

const lines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)

const toForm = (t: StaffTreasure): Form => ({
  area_id: t.area_id,
  name: t.name,
  description: t.description,
  sort: String(t.sort),
  active: t.active,
  locate_question: t.locate_question,
  locate_answers: t.locate_answers.join('\n'),
  locate_hints: t.locate_hints.join('\n'),
  place_hint: t.place_hint,
  place_image_url: t.place_image_url ?? '',
  acquire_question: t.acquire_question,
  acquire_answers: t.acquire_answers.join('\n'),
  acquire_hints: t.acquire_hints.join('\n'),
  pin_x: String(t.pin_x),
  pin_y: String(t.pin_y),
})

const EMPTY_FORM = (areaId: string): Form => ({
  area_id: areaId,
  name: '',
  description: '',
  sort: '',
  active: true,
  locate_question: '',
  locate_answers: '',
  locate_hints: '',
  place_hint: '',
  place_image_url: '',
  acquire_question: '',
  acquire_answers: '',
  acquire_hints: '',
  pin_x: '200',
  pin_y: '300',
})

function validate(f: Form): string[] {
  const e: string[] = []
  if (!f.name.trim()) e.push('お宝の名前を入れてください')
  if (f.name.trim().length > 40) e.push('お宝の名前は40文字以内にしてください')
  if (!f.locate_question.trim()) e.push('宝の道標の問題文を入れてください')
  if (lines(f.locate_answers).length === 0) e.push('宝の道標の正解を1つ以上入れてください')
  if (!f.acquire_question.trim()) e.push('鍵のかかった宝箱の謎の問題文を入れてください')
  if (lines(f.acquire_answers).length === 0) e.push('鍵のかかった宝箱の謎の正解を1つ以上入れてください')
  if (f.place_image_url.trim() && !/^https?:\/\//i.test(f.place_image_url.trim())) e.push('画像URLは https:// から始まるURLにしてください')
  if (f.sort.trim() && !/^\d+$/.test(f.sort.trim())) e.push('並び順は数字で入れてください')
  return e
}

export default function TreasureEdit() {
  const { id } = useParams()
  const isNew = !id
  const { content, reloadContent } = useGame()
  const navigate = useNavigate()
  const [orig, setOrig] = useState<StaffTreasure | null>(null)
  const [form, setForm] = useState<Form | null>(isNew ? EMPTY_FORM(content.areas[0]?.id ?? '') : null)
  const [errors, setErrors] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loadErr, setLoadErr] = useState('')

  useEffect(() => {
    if (isNew) return
    staff<StaffTreasure[]>('staff_treasures')
      .then((list) => {
        const t = list.find((x) => x.id === id)
        if (!t) setLoadErr('この謎は見つかりませんでした')
        else {
          setOrig(t)
          setForm(toForm(t))
        }
      })
      .catch((e) => setLoadErr(errorMessage(e)))
  }, [id, isNew])

  if (loadErr)
    return (
      <div className="stack-16">
        <p className="form-msg">{loadErr}</p>
        <Link to="/admin/treasures" className="btn btn-outline">
          一覧へ戻る
        </Link>
      </div>
    )
  if (!form) return <p className="muted">読み込み中…</p>

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm({ ...form, [k]: v })
    setConfirming(false)
  }

  function review(e: FormEvent) {
    e.preventDefault()
    const errs = validate(form!)
    setErrors(errs)
    if (errs.length === 0) setConfirming(true)
  }

  async function save() {
    if (!form) return
    setBusy(true)
    setErrors([])
    try {
      const savedId = await staff<string>('staff_save_treasure', {
        p_t: {
          id: orig?.id ?? null,
          no: orig?.no ?? null,
          area_id: form.area_id,
          name: form.name.trim(),
          description: form.description.trim(),
          sort: form.sort.trim() ? Number(form.sort) : null,
          active: form.active,
          locate_question: form.locate_question.trim(),
          locate_answers: lines(form.locate_answers),
          locate_hints: lines(form.locate_hints),
          place_hint: form.place_hint.trim(),
          place_image_url: form.place_image_url.trim(),
          acquire_question: form.acquire_question.trim(),
          acquire_answers: lines(form.acquire_answers),
          acquire_hints: lines(form.acquire_hints),
          pin_x: Number(form.pin_x) || 0,
          pin_y: Number(form.pin_y) || 0,
        },
      })
      await reloadContent().catch(() => undefined)
      navigate('/admin/treasures', {
        state: {
          saved: isNew
            ? `「${form.name.trim()}」を追加しました（ID：${savedId}）。QRコードは「QR印刷」から印刷できます。`
            : `「${form.name.trim()}」を保存しました。参加者の画面には、次に開いたとき（再読み込み時）から反映されます。`,
        },
      })
    } catch (e) {
      setErrors([errorMessage(e)])
      setConfirming(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack-24">
      <div className="stack-4">
        <Link to="/admin/treasures" className="small">
          ← お宝・謎の一覧
        </Link>
        <h1 className="h1">{isNew ? '新しい謎を追加' : `No.${orig?.no} ${orig?.name} を編集`}</h1>
      </div>

      <form className="admin-cols" onSubmit={review} noValidate>
        <div className="col stack-16">
          <section className="admin-card stack-12">
            <h2 className="card-title">お宝</h2>
            <Field label="エリア">
              <select className="input" value={form.area_id} onChange={(e) => set('area_id', e.target.value)}>
                {content.areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="お宝の名前" required>
              <input className="input" value={form.name} maxLength={40} onChange={(e) => set('name', e.target.value)} placeholder="例：貝殻の羅針盤" />
            </Field>
            <Field label="お宝の説明" note="獲得したときに表示されます">
              <textarea className="input textarea" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
            <div className="row-12 wrap">
              <Field label="並び順" note={isNew ? '空欄なら最後に追加' : '小さいほど先に出ます'}>
                <input className="input input-short" inputMode="numeric" value={form.sort} onChange={(e) => set('sort', e.target.value)} />
              </Field>
              <label className="row-8 check-field">
                <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
                参加者に表示する
              </label>
            </div>
          </section>

          <section className="admin-card stack-12">
            <h2 className="card-title">① 宝の道標</h2>
            <Field label="問題文" required>
              <textarea className="input textarea" rows={3} value={form.locate_question} onChange={(e) => set('locate_question', e.target.value)} />
            </Field>
            <Field label="正解" required note="1行に1つ。複数書くとどれでも正解。ひらがな・カタカナ・全角半角・空白の違いは自動で吸収します">
              <textarea className="input textarea" rows={2} value={form.locate_answers} onChange={(e) => set('locate_answers', e.target.value)} />
            </Field>
            <Field label="ヒント" note="1行に1つ。上から順に出ます">
              <textarea className="input textarea" rows={2} value={form.locate_hints} onChange={(e) => set('locate_hints', e.target.value)} />
            </Field>
          </section>

          <section className="admin-card stack-12">
            <h2 className="card-title">② 場所のヒント（道標を解くと表示）</h2>
            <Field label="場所の説明" note="任意">
              <textarea className="input textarea" rows={2} value={form.place_hint} onChange={(e) => set('place_hint', e.target.value)} />
            </Field>
            <Field label="場所の画像URL" note="任意。https:// から始まるURL">
              <input className="input" type="url" value={form.place_image_url} onChange={(e) => set('place_image_url', e.target.value)} placeholder="https://..." />
            </Field>
            {/^https?:\/\//i.test(form.place_image_url.trim()) && <img className="hint-image admin-preview" src={form.place_image_url.trim()} alt="場所の画像のプレビュー" />}
          </section>

          <section className="admin-card stack-12">
            <h2 className="card-title">③ 鍵のかかった宝箱の謎（QRを読んだ後）</h2>
            <Field label="問題文" required>
              <textarea className="input textarea" rows={3} value={form.acquire_question} onChange={(e) => set('acquire_question', e.target.value)} />
            </Field>
            <Field label="正解" required note="1行に1つ。複数書くとどれでも正解">
              <textarea className="input textarea" rows={2} value={form.acquire_answers} onChange={(e) => set('acquire_answers', e.target.value)} />
            </Field>
            <Field label="ヒント" note="1行に1つ">
              <textarea className="input textarea" rows={2} value={form.acquire_hints} onChange={(e) => set('acquire_hints', e.target.value)} />
            </Field>
          </section>

          <section className="admin-card stack-12">
            <h2 className="card-title">地図のピン位置</h2>
            <p className="small muted">QRを読んだ後、地図に宝箱が出る位置です（横 0〜390、縦 110〜460）。</p>
            <div className="row-12 wrap">
              <Field label="横（x）">
                <input className="input input-short" inputMode="numeric" value={form.pin_x} onChange={(e) => set('pin_x', e.target.value)} />
              </Field>
              <Field label="縦（y）">
                <input className="input input-short" inputMode="numeric" value={form.pin_y} onChange={(e) => set('pin_y', e.target.value)} />
              </Field>
            </div>
          </section>
        </div>

        <div className="col-narrow stack-16 sticky-col">
          <AnswerTester locate={lines(form.locate_answers)} acquire={lines(form.acquire_answers)} />

          <section className="admin-card stack-12">
            {errors.length > 0 && (
              <ul className="form-errors" role="alert">
                {errors.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
            {!confirming ? (
              <button type="submit" className="btn btn-deep">
                内容を確認する
              </button>
            ) : (
              <ConfirmPanel form={form} orig={orig} busy={busy} onSave={save} onBack={() => setConfirming(false)} />
            )}
            {!isNew && orig?.short_code && <p className="small muted">QRの6桁コード：{orig.short_code}（QR印刷・再発行は「QR印刷」から）</p>}
          </section>
        </div>
      </form>
    </div>
  )
}

function Field({ label, note, required, children }: { label: string; note?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="stack-4 field">
      <span className="label">
        {label}
        {required && <span className="req">必須</span>}
      </span>
      {children}
      {note && <span className="small muted">{note}</span>}
    </label>
  )
}

/** 保存前の確認。正解が変わる場合は、変更前と変更後を並べて見せる */
function ConfirmPanel({ form, orig, busy, onSave, onBack }: { form: Form; orig: StaffTreasure | null; busy: boolean; onSave: () => void; onBack: () => void }) {
  const la = lines(form.locate_answers)
  const aa = lines(form.acquire_answers)
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])
  const changes: { label: string; before: string[]; after: string[] }[] = []
  if (orig && !same(orig.locate_answers, la)) changes.push({ label: '宝の道標の正解', before: orig.locate_answers, after: la })
  if (orig && !same(orig.acquire_answers, aa)) changes.push({ label: '宝箱の謎の正解', before: orig.acquire_answers, after: aa })

  return (
    <div className="stack-12" role="region" aria-label="保存前の確認">
      <h3 className="card-title">この内容で保存しますか？</h3>
      {orig ? (
        changes.length > 0 ? (
          <div className="stack-10">
            {changes.map((c) => (
              <div key={c.label} className="diff-box stack-4">
                <b className="small">{c.label}が変わります</b>
                <span className="small diff-before">変更前：{c.before.join(' ／ ') || '（なし）'}</span>
                <span className="small diff-after">変更後：{c.after.join(' ／ ')}</span>
              </div>
            ))}
            <p className="small muted">すでに正解した参加者の進み具合はそのままです。これから答える人に新しい正解が使われます。</p>
          </div>
        ) : (
          <p className="small muted">正解は変わりません。</p>
        )
      ) : (
        <div className="diff-box stack-4">
          <span className="small">宝の道標の正解：{la.join(' ／ ')}</span>
          <span className="small">宝箱の謎の正解：{aa.join(' ／ ')}</span>
          <span className="small muted">QRコードと6桁コードは自動で作られます。</span>
        </div>
      )}
      {!form.active && <p className="small warn">「参加者に表示する」がオフです。参加者には見えません。</p>}
      <div className="row-8 wrap">
        <button type="button" className="btn btn-deep" disabled={busy} onClick={onSave}>
          {busy ? '保存中…' : 'この内容で保存'}
        </button>
        <button type="button" className="btn btn-text" disabled={busy} onClick={onBack}>
          戻って直す
        </button>
      </div>
    </div>
  )
}

/** 答え合わせテスト：参加者と同じ判定で、入力が正解になるか確かめる（保存前の正解でも試せる） */
function AnswerTester({ locate, acquire }: { locate: string[]; acquire: string[] }) {
  const [kind, setKind] = useState<'locate' | 'acquire'>('locate')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{ ok: boolean; normalized: string } | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function test() {
    setBusy(true)
    setMsg('')
    try {
      const r = await staff<{ ok: boolean; normalized: string }>('staff_check_answer', {
        p_answers: kind === 'locate' ? locate : acquire,
        p_input: input,
      })
      setResult(r)
    } catch (e) {
      setMsg(errorMessage(e))
      setResult(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-card stack-12">
      <h2 className="card-title">答え合わせテスト</h2>
      <p className="small muted">参加者と同じ判定で、入力が正解になるか試せます。保存前の正解でも試せます。</p>
      <div className="segmented" role="group" aria-label="テストする謎">
        <button type="button" aria-pressed={kind === 'locate'} className={kind === 'locate' ? 'on' : ''} onClick={() => { setKind('locate'); setResult(null) }}>
          宝の道標
        </button>
        <button type="button" aria-pressed={kind === 'acquire'} className={kind === 'acquire' ? 'on' : ''} onClick={() => { setKind('acquire'); setResult(null) }}>
          宝箱の謎
        </button>
      </div>
      <input
        className="input"
        aria-label="テストする回答"
        placeholder="参加者が入れそうな答え"
        value={input}
        onChange={(e) => {
          setInput(e.target.value)
          setResult(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (input.trim()) test()
          }
        }}
      />
      <button type="button" className="btn btn-outline" disabled={busy || !input.trim()} onClick={test}>
        判定する
      </button>
      <div role="status" aria-live="polite">
        {result && (
          <p className={'test-result ' + (result.ok ? 'ok' : 'ng')}>
            {result.ok ? '◯ 正解になります' : '× 不正解になります'}
            <span className="small muted">判定に使われる形：{result.normalized || '（空）'}</span>
          </p>
        )}
        {msg && <p className="form-msg">{msg}</p>}
      </div>
    </section>
  )
}
