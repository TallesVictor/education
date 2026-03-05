import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { Icon } from '../components/Icon'

const sidebarLogoSrc = `/logo_educ.png?v=${Date.now()}`

const navGroups = [
  {
    title: 'Geral',
    items: [{ to: '/dashboard', label: 'Painel', icon: 'dashboard' }],
  },
  {
    title: 'Cadastros',
    items: [
      { to: '/users', label: 'Usuários', icon: 'users' },
      { to: '/schools', label: 'Escolas', icon: 'school' },
      { to: '/subjects', label: 'Disciplinas', icon: 'subject' },
      { to: '/materials', label: 'Materiais', icon: 'material' },
      { to: '/classes', label: 'Turmas', icon: 'class' },
      { to: '/enrollments', label: 'Matrículas', icon: 'enrollment' },
    ],
  },
  {
    title: 'Acesso',
    items: [
      { to: '/roles', label: 'Perfis', icon: 'role' },
      { to: '/permissions', label: 'Permissões', icon: 'permission' },
    ],
  },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [location.pathname])

  async function handleLogout() {
    await logout()
    toast.info('Sessão encerrada.')
    navigate('/login')
  }

  const currentDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date())

  const shellClassName = [
    'app-shell',
    isSidebarCollapsed ? 'app-shell-sidebar-collapsed' : '',
    isMobileSidebarOpen ? 'app-shell-mobile-nav-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClassName}>
      <aside className="sidebar" id="app-sidebar">
        <div className="sidebar-controls">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            aria-expanded={!isSidebarCollapsed}
            aria-label={isSidebarCollapsed ? 'Expandir menu lateral' : 'Retrair menu lateral'}
          >
            <Icon name={isSidebarCollapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
            <span className="sidebar-toggle-label">
              {isSidebarCollapsed ? 'Expandir menu' : ''}
            </span>
          </button>
        </div>

        <div className="brand-block">
          <img src={sidebarLogoSrc} alt="RSoft Education" className="sidebar-logo" />
          {/* <p className="brand-overline">Plataforma Escolar</p> */}
          {/* <h1>RSoft Education</h1> */}
          <p className="sidebar-meta">Tecnologia acadêmica para escola, professores e alunos.</p>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.title} className="nav-group">
              <p className="nav-group-title">{group.title}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                >
                  <Icon name={item.icon} className="nav-link-icon" />
                  <span className="nav-link-text">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <button type="button" className="ghost-button" onClick={handleLogout}>
          <Icon name="logout" />
          <span className="ghost-button-label">Sair</span>
        </button>
      </aside>

      {isMobileSidebarOpen ? (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-label="Fechar menu lateral"
        />
      ) : null}

      <main className="content">
        <header className="topbar">
          <div>
            <p className="topbar-kicker">
              <span className="topbar-kicker-row">
                <Icon name="session" size={15} />
                Sessão ativa
              </span>
            </p>
            <h2>Olá, {user?.display_name ?? user?.name}</h2>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setIsMobileSidebarOpen((current) => !current)}
              aria-expanded={isMobileSidebarOpen}
              aria-controls="app-sidebar"
              aria-label={isMobileSidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
            >
              <Icon name={isMobileSidebarOpen ? 'close' : 'menu'} size={16} />
              <span>{isMobileSidebarOpen ? 'Fechar menu' : 'Menu'}</span>
            </button>

            <div className="topbar-badges">
              <span className="badge-inline badge-inline-primary">
                <Icon name="shield" size={14} />
                Ambiente seguro
              </span>
              <span className="badge-inline">{currentDate}</span>
            </div>
          </div>
        </header>

        <section className="page-container">
          <Outlet />
        </section>
      </main>
    </div>
  )
}
