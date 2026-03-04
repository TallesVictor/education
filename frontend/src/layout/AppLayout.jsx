import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/dashboard', label: 'Painel' },
  { to: '/users', label: 'Usuários' },
  { to: '/schools', label: 'Escolas' },
  { to: '/subjects', label: 'Disciplinas' },
  { to: '/classes', label: 'Turmas' },
  { to: '/roles', label: 'Perfis' },
  { to: '/permissions', label: 'Permissões' },
  { to: '/enrollments', label: 'Matrículas' },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="brand-overline">Sistema Web Escolar</p>
          <h1>Planejement</h1>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="ghost-button" onClick={handleLogout}>
          Sair
        </button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="topbar-kicker">Sessão ativa</p>
            <h2>Olá, {user?.display_name ?? user?.name}</h2>
          </div>
          <span className="badge-inline">Multi-tenant</span>
        </header>

        <section className="page-container">
          <Outlet />
        </section>
      </main>
    </div>
  )
}
