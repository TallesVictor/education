import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { Icon } from '../components/Icon'

const sidebarLogoSrc = `/logo_educ.png?v=${Date.now()}`

const navGroups = [
  {
    title: 'Geral',
    items: [{ to: '/dashboard', label: 'Painel', icon: 'dashboard', module: 'dashboard' }],
  },
  {
    title: 'Cadastros',
    items: [
      { to: '/users', label: 'Usuários', icon: 'users', module: 'users' },
      { to: '/schools', label: 'Escolas', icon: 'school', module: 'schools' },
      { to: '/subjects', label: 'Disciplinas', icon: 'subject', module: 'subjects' },
      { to: '/materials', label: 'Materiais', icon: 'material', module: 'materials' },
      { to: '/classes', label: 'Turmas', icon: 'class', module: 'classes' },
      { to: '/enrollments', label: 'Matrículas', icon: 'enrollment', module: 'enrollments' },
    ],
  },
  {
    title: 'Acesso',
    items: [
      { to: '/roles', label: 'Perfis', icon: 'role', module: 'roles' },
      { to: '/permissions', label: 'Permissões', icon: 'permission', module: 'permissions' },
    ],
  },
]

const allProfiles = ['Admin', 'Diretor', 'Coordenador', 'Professor', 'Aluno']

const allowedModulesByProfile = {
  admin: null,
  diretor: ['dashboard', 'users', 'subjects', 'classes', 'materials', 'enrollments'],
  coordenador: ['dashboard', 'subjects', 'classes', 'materials', 'enrollments'],
  professor: ['dashboard', 'materials'],
  aluno: ['dashboard', 'materials'],
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [viewAsRole, setViewAsRole] = useState('')

  const normalizedCurrentRole = (user?.role_name || '').toLowerCase()
  const normalizedViewAsRole = viewAsRole.toLowerCase()
  const activeRole = normalizedViewAsRole || normalizedCurrentRole
  const allowedModules = allowedModulesByProfile[activeRole] ?? null
  const hasRoleSimulation = Boolean(normalizedViewAsRole)

  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const canAccessCurrentRoute = navGroups
      .flatMap((group) => group.items)
      .some(
        (item) =>
          location.pathname.startsWith(item.to) &&
          (!allowedModules || allowedModules.includes(item.module)),
      )

    if (!canAccessCurrentRoute && location.pathname !== '/dashboard') {
      navigate('/dashboard', { replace: true })
    }
  }, [allowedModules, location.pathname, navigate])

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

        <div className="view-as-switcher">
          <label htmlFor="view-as-role" className="view-as-label">
            Ver como
          </label>
          <select
            id="view-as-role"
            className="view-as-select"
            value={viewAsRole}
            onChange={(event) => setViewAsRole(event.target.value)}
          >
            <option value="">Perfil atual ({user?.role_name || 'N/A'})</option>
            {allProfiles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <p className="view-as-hint">Pré-visualização de menu por perfil.</p>
        </div>

        <nav className="sidebar-nav">
          {navGroups
            .map((group) => ({
              ...group,
              items: group.items.filter(
                (item) => !allowedModules || allowedModules.includes(item.module),
              ),
            }))
            .filter((group) => group.items.length > 0)
            .map((group) => (
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
              {hasRoleSimulation ? (
                <span className="badge-inline badge-inline-primary">
                  <Icon name="preview" size={14} />
                  Ver como: {viewAsRole}
                </span>
              ) : null}
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
