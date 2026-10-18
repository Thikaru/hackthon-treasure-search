import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackHeader } from '../components/Common'
import { useGame } from '../lib/game'
import { errorMessage } from '../lib/supabase'

export default function Help() {
  const { me, content, restore, leave } = useGame()
  const nav = useNavigate()
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const { clearCount, contact } = content.settings

  return (
    <div className="screen">
      <BackHeader title="遊び方・ヘルプ" />
      <div className="page stack-14">
        <section className="card stack-12">
          <h2 className="card-title">遊び方</h2>
          <ol className="steps">
            <li>
              <b>宝の道標</b>を解くと、お宝の場所のヒント（画像・説明）が届く
            </li>
            <li>
              現地でポールの<b>QRコード</b>を探して読み込む（場所が地図に表示される）
            </li>
            <li>
              <b>鍵のかかった宝箱の謎</b>を解くと、お宝ゲット（QRを読んだ後はどこからでも回答できる）
            </li>
            <li className="accent">
              渋川の{clearCount}個のお宝を全部集めたら<b>クリア証明</b>を受付で見せて景品と交換
            </li>
          </ol>
        </section>
        <section className="card stack-8">
          <h2 className="card-title">注意事項</h2>
          <p className="small muted2 lh">
            立入禁止区域・私有地に入らない／満潮時は波打ち際に近づかない／お宝のポールを抜かない／車で移動する場合は運転中に操作しない
          </p>
        </section>
        {me.player && (
          <section className="card stack-10">
            <h2 className="card-title">データの引き継ぎ</h2>
            <p className="small muted2 lh">別の端末で続けるときは、この引き継ぎコードを入力します。人に見せないでください。</p>
            <div className="code-box">{me.player.transfer_code}</div>
          </section>
        )}
        <section className="card stack-10">
          <h2 className="card-title">別の端末から続きをする</h2>
          <label htmlFor="restore" className="small muted2">
            前の端末の引き継ぎコード（10文字）
          </label>
          <input id="restore" className="input" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
          <button
            type="button"
            className="btn btn-deep"
            onClick={async () => {
              try {
                if (await restore(code)) {
                  setMsg('復元しました')
                  nav('/home')
                } else setMsg('コードが正しくありません')
              } catch (e) {
                setMsg(errorMessage(e))
              }
            }}
          >
            復元する
          </button>
          {me.player && <p className="small muted">復元すると、この端末で今遊んでいるデータは引き継ぎ元のデータに置き換わります。</p>}
        </section>
        <p className="form-msg" role="status" aria-live="polite">
          {msg}
        </p>
        {contact && (
          <section className="between small">
            <span className="muted">お問い合わせ</span>
            <b>{contact}</b>
          </section>
        )}
        {me.player && (
          <button
            type="button"
            className="btn btn-text danger"
            onClick={async () => {
              if (confirm('この端末からログアウトします。引き継ぎコードを控えていないと、続きができなくなります。よろしいですか？')) {
                await leave()
                nav('/')
              }
            }}
          >
            この端末からログアウト
          </button>
        )}
      </div>
    </div>
  )
}
