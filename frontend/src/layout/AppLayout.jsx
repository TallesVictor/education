import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

const navGroups = [
  {
    title: 'Geral',
    items: [{ to: '/dashboard', label: 'Painel' }],
  },
  {
    title: 'Cadastros',
    items: [
      { to: '/users', label: 'Usuários' },
      { to: '/schools', label: 'Escolas' },
      { to: '/subjects', label: 'Disciplinas' },
      { to: '/classes', label: 'Turmas' },
      { to: '/enrollments', label: 'Matrículas' },
    ],
  },
  {
    title: 'Acesso',
    items: [
      { to: '/roles', label: 'Perfis' },
      { to: '/permissions', label: 'Permissões' },
    ],
  },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    toast.info('Sessão encerrada.')
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
          {navGroups.map((group) => (
            <div key={group.title} className="nav-group">
              <p className="nav-group-title">{group.title}</p>
              {group.items.map((item) => (
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
            </div>
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
