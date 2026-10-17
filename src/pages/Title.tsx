import { Link } from 'react-router-dom'
import { useGame } from '../lib/game'
import { useTimeOfDay } from '../lib/useTimeOfDay'
import titleBeach from '../assets/title-beach.jpg'
import titleDusk from '../assets/title-dusk.jpg'
import titleNight from '../assets/title-night.jpg'

const BG_BY_TIME = { day: titleBeach, dusk: titleDusk, night: titleNight }

// アプリのタイトルはSupabaseを介さず直書き
const APP_TITLE = '渋川からの挑戦状'

export default function Title() {
  const { me, content } = useGame()
  const GAME = content.settings
  const timeOfDay = useTimeOfDay()
  return (
    <div className={`screen title-screen title-screen--${timeOfDay}`}>
      <img src={BG_BY_TIME[timeOfDay]} alt="" className="title-bg" aria-hidden="true" />
      <div className="title-scrim" aria-hidden="true" />
      <div className="title-vignette" aria-hidden="true" />
      <div className="title-content">
        <div className="title-heading">
          <p className="title-kicker">{GAME.subtitle}</p>
          <h1 className="title-name">{APP_TITLE}</h1>
          <p className="title-lead">
            謎を解いて、砂浜と街にかくれた
            <br />
            お宝を集めよう
          </p>
        </div>
        <div className="title-actions">
          {me.player ? (
            <>
              <Link to="/home" className="btn btn-primary btn-lg">
                つづきから
              </Link>
              <p className="title-note">{me.player.nickname} さんで参加中</p>
            </>
          ) : (
            <Link to="/register" className="btn btn-primary btn-lg">
              はじめる
            </Link>
          )}
          <Link to="/help" className="btn btn-text">
            遊び方を見る
          </Link>
        </div>
      </div>
    </div>
  )
}
