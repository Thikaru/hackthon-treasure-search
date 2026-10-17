import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './admin/AdminLayout'
import Dashboard from './admin/Dashboard'
import History from './admin/History'
import Players from './admin/Players'
import QrPrint from './admin/QrPrint'
import Redeem from './admin/Redeem'
import TreasureEdit from './admin/TreasureEdit'
import TreasuresAdmin from './admin/TreasuresAdmin'
import { useGame } from './lib/game'
import Acquired from './pages/Acquired'
import Found from './pages/Found'
import Guideposts from './pages/Guideposts'
import Help from './pages/Help'
import Home from './pages/Home'
import LocatePuzzle from './pages/LocatePuzzle'
import Register from './pages/Register'
import Scan from './pages/Scan'
import Title from './pages/Title'
import TokenResolve from './pages/TokenResolve'
import { Certificate, Collection } from './pages/TreasureTabs'

function RequirePlayer({ children }: { children: ReactNode }) {
  const { me } = useGame()
  if (!me.player) return <Navigate to="/" replace />
  return <>{children}</>
}

const P = (el: ReactNode) => <RequirePlayer>{el}</RequirePlayer>

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="redeem" element={<Redeem />} />
        <Route path="history" element={<History />} />
        <Route path="players" element={<Players />} />
        <Route path="treasures" element={<TreasuresAdmin />} />
        <Route path="treasures/new" element={<TreasureEdit />} />
        <Route path="treasures/:id" element={<TreasureEdit />} />
        <Route path="qr" element={<QrPrint />} />
      </Route>
      <Route path="*" element={<PlayerRoutes />} />
    </Routes>
  )
}

function PlayerRoutes() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Title />} />
        <Route path="/register" element={<Register />} />
        <Route path="/help" element={<Help />} />
        <Route path="/t/:token" element={<TokenResolve />} />
        <Route path="/home" element={P(<Home />)} />
        <Route path="/guideposts" element={P(<Guideposts />)} />
        <Route path="/puzzle/:id" element={P(<LocatePuzzle />)} />
        <Route path="/scan" element={P(<Scan />)} />
        <Route path="/found/:id" element={P(<Found />)} />
        <Route path="/got/:id" element={P(<Acquired />)} />
        <Route path="/treasures" element={P(<Collection />)} />
        <Route path="/certificate" element={P(<Certificate />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
