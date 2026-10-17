import { Link } from 'react-router-dom'
import { useGame } from '../lib/game'

export default function Title() {
  const { me, content } = useGame()
  const GAME = content.settings
  return (
    <div className="screen title-screen">
      <svg className="title-bg" viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <rect x="0" y="0" width="390" height="844" fill="#A9C6EC" />
        <rect x="0" y="0" width="390" height="250" fill="#8FB4E6" />
        <g fill="#FFFFFF" opacity="0.85">
          <ellipse cx="60" cy="300" rx="90" ry="26" />
          <ellipse cx="120" cy="286" rx="56" ry="22" />
          <ellipse cx="320" cy="96" rx="70" ry="18" />
          <ellipse cx="290" cy="86" rx="40" ry="16" />
        </g>
        <g fill="#FFFFFF" opacity="0.5">
          <path d="M190 380 C 240 360, 300 372, 390 350 L390 362 C 300 384, 240 374, 190 392 Z" />
          <path d="M0 420 C 60 404, 130 414, 210 398 L210 408 C 130 424, 60 416, 0 432 Z" />
        </g>
        <path d="M0 512 L30 506 L60 510 L110 508 L150 511 L210 509 L250 504 L290 507 L330 502 L390 506 L390 516 L0 516 Z" fill="#8FA5C2" />
        <rect x="0" y="515" width="390" height="70" fill="#6E8DB4" />
        <rect x="0" y="515" width="390" height="3" fill="#B7C9E0" />
        <g fill="#D9472B">
          <circle cx="24" cy="575" r="3" />
          <circle cx="96" cy="577" r="3" />
          <circle cx="170" cy="576" r="3" />
          <circle cx="250" cy="577" r="3" />
          <circle cx="336" cy="575" r="3" />
        </g>
        <rect x="52" y="548" width="3" height="30" fill="#3C3A36" />
        <rect x="0" y="584" width="390" height="260" fill="#D9B98A" />
        <g fill="#C7A673">
          <ellipse cx="60" cy="640" rx="6" ry="2" />
          <ellipse cx="160" cy="700" rx="7" ry="2" />
          <ellipse cx="300" cy="660" rx="6" ry="2" />
          <ellipse cx="240" cy="760" rx="7" ry="2" />
          <ellipse cx="90" cy="800" rx="6" ry="2" />
        </g>
        <path d="M228 586 L348 586 L338 612 Q 300 620 244 612 Z" fill="#FFFFFF" />
        <path d="M224 580 Q 286 572 352 580 L348 590 L228 590 Z" fill="#1F4FB8" />
        <path d="M250 614 L262 626 M320 614 L308 626" stroke="#A58457" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="title-content">
        <p className="title-kicker">{GAME.subtitle}</p>
        <h1 className="title-name">{GAME.title}</h1>
        <p className="title-lead">
          謎を解いて、砂浜と街にかくれた
          <br />
          お宝を集めよう
        </p>
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
