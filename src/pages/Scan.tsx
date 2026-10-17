import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import QrScanner from '../components/QrScanner'
import TabBar from '../components/TabBar'
import { useGame } from '../lib/game'
import { errorMessage } from '../lib/supabase'

// QRの中身（URL or トークン）からトークンを取り出す
export function tokenFromQr(text: string): string | null {
  const m = text.match(/#\/t\/([A-Za-z0-9_-]+)/) ?? text.match(/^([a-f0-9]{8,32})$/)
  return m ? m[1] : null
}

export default function Scan() {
  const nav = useNavigate()
  const { scan } = useGame()
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const busy = useRef(false)

  async function tryCode(c: string, notFound: string) {
    if (busy.current) return
    busy.current = true
    try {
      const r = await scan(c)
      if (r.ok && r.treasure_id) nav(r.state === 'acquired' ? `/got/${r.treasure_id}` : `/found/${r.treasure_id}`)
      else setMsg(notFound)
    } catch (e) {
      setMsg(errorMessage(e))
    } finally {
      busy.current = false
    }
  }

  function handleQr(text: string) {
    const token = tokenFromQr(text)
    if (token) tryCode(token, 'このQRはお宝のQRではないようです')
    else setMsg('このQRはお宝のQRではないようです')
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const c = code.replace(/\D/g, '')
    if (c.length !== 6) {
      setMsg('6桁の数字を入力してください')
      return
    }
    tryCode(c, 'コードが見つかりません。6桁の数字を確かめてください')
  }

  return (
    <div className="screen with-tabbar scan-screen">
      <div className="scan-top">
        <h1>お宝のQRを読み込む</h1>
        <QrScanner onResult={handleQr} />
        <p className="scan-tip">
          ポールのQRコードを枠に合わせてください
          <br />
          スマホ標準のカメラで読んでもOK
        </p>
      </div>
      <section className="scan-sheet">
        <h2>読み取れないときは</h2>
        <form className="stack-8" onSubmit={submit}>
          <label htmlFor="shortcode" className="small muted2">
            QRの下に書いてある6桁のコードを入力
          </label>
          <div className="row-8">
            <input
              id="shortcode"
              className="input input-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setMsg('')
              }}
            />
            <button type="submit" className="btn btn-deep btn-answer">
              確認
            </button>
          </div>
        </form>
        <p className="form-msg" role="status" aria-live="polite">
          {msg}
        </p>
      </section>
      <TabBar />
    </div>
  )
}
