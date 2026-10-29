import { NavLink, Outlet } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/hunts/import', label: 'Importar hunt' },
  { to: '/hunts', label: 'Hunts', end: true },
  { to: '/characters', label: 'Personagens' },
  { to: '/items', label: 'Itens & Preços' },
]

export default function Layout() {
  const { syncError, clearSyncError } = useData()
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-ball" />
          PXG Drops
        </div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        {syncError && (
          <div className="card warn row">
            <span>⚠ Falha ao salvar no banco: {syncError}</span>
            <button className="btn small" onClick={() => window.location.reload()}>Recarregar</button>
            <button className="btn small" onClick={clearSyncError}>×</button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
