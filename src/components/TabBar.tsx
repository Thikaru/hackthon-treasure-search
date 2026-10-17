import { NavLink, useLocation } from 'react-router-dom'
import { ChestIcon, MapIcon, ScanIcon } from './Icons'

export default function TabBar() {
  const { pathname } = useLocation()
  const treasureTab = pathname.startsWith('/treasures') || pathname.startsWith('/certificate')
  return (
    <nav className="tabbar" aria-label="メインメニュー">
      <NavLink to="/home" className="tab">
        <MapIcon />
        ホーム
      </NavLink>
      <NavLink to="/scan" className="tab tab-scan" aria-label="スキャン">
        <span className="tab-scan-btn">
          <ScanIcon size={28} />
        </span>
        スキャン
      </NavLink>
      <NavLink
        to="/treasures"
        className={'tab' + (treasureTab ? ' active' : '')}
        aria-current={treasureTab ? 'page' : undefined}
      >
        <ChestIcon />
        お宝
      </NavLink>
    </nav>
  )
}
