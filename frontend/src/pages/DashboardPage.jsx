import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Icon } from '../components/Icon'
import { useAuth } from '../hooks/useAuth'

const FULL_DATASET_PAGE_SIZE = 200
const MAX_DATASET_PAGES = 50
const DATASET_LABELS = {
  schools: 'Escolas',
  users: 'Usuários',
  subjects: 'Disciplinas',
  classes: 'Turmas',
  materials: 'Materiais',
  enrollments: 'Matrículas',
}

const VIEW_CONFIG = {
  coordenacao: {
    label: 'Coordenação',
    subtitle: 'Foco pedagógico e continuidade acadêmica.',
    icon: 'teacher',
    requirements: ['classes', 'subjects', 'materials', 'enrollments'],
  },
  direcao: {
    label: 'Direção',
    subtitle: 'Foco em operação escolar e equipe.',
    icon: 'school',
    requirements: ['users', 'classes', 'materials', 'enrollments'],
  },
  admin: {
    label: 'Administração',
    subtitle: 'Foco sistêmico e visão multiunidade.',
    icon: 'shield',
    requirements: ['schools', 'users', 'subjects', 'classes', 'materials', 'enrollments'],
  },
}

const QUICK_LINKS = {
  coordenacao: [
    { to: '/classes', label: 'Turmas', icon: 'class', description: 'Ajustar carga e distribuição de alunos.' },
    { to: '/subjects', label: 'Disciplinas', icon: 'subject', description: 'Revisar alcance por componente curricular.' },
    { to: '/enrollments', label: 'Matrículas', icon: 'enrollment', description: 'Resolver vínculos pendentes da semana.' },
    { to: '/materials', label: 'Materiais', icon: 'material', description: 'Publicar conteúdo para as turmas prioritárias.' },
  ],
  direcao: [
    { to: '/users', label: 'Usuários', icon: 'users', description: 'Conferir distribuição entre perfis e equipes.' },
    { to: '/classes', label: 'Turmas', icon: 'class', description: 'Acompanhar lotação e capacidade operacional.' },
    { to: '/enrollments', label: 'Matrículas', icon: 'enrollment', description: 'Mitigar gargalos de vínculos acadêmicos.' },
    { to: '/materials', label: 'Materiais', icon: 'material', description: 'Validar acervo publicado para estudantes.' },
  ],
  admin: [
    { to: '/schools', label: 'Escolas', icon: 'school', description: 'Monitorar cobertura e expansão por unidade.' },
    { to: '/users', label: 'Usuários', icon: 'users', description: 'Auditar volume global de contas ativas.' },
    { to: '/roles', label: 'Perfis', icon: 'role', description: 'Padronizar governança de acesso.' },
    { to: '/permissions', label: 'Permissões', icon: 'permission', description: 'Garantir segurança por módulo.' },
  ],
}

const EMPTY_DATASET = {
  items: [],
  total: 0,
  blocked: false,
}

function normalizeRoleName(roleName) {
  return String(roleName || '').toLowerCase().trim()
}

function resolveRecommendedView(roleName) {
  const normalizedRole = normalizeRoleName(roleName)

  if (normalizedRole === 'admin') {
    return 'admin'
  }

  if (normalizedRole === 'diretor') {
    return 'direcao'
  }

  return 'coordenacao'
}

function toNumber(value) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(toNumber(value))
}

function formatPercent(partial, total) {
  if (!total) {
    return '0%'
  }

  const percentage = Math.round((toNumber(partial) / toNumber(total)) * 100)
  return `${percentage}%`
}

function rankEntries(entries, limit = 6) {
  const topEntries = [...entries]
    .filter((entry) => entry.label && toNumber(entry.value) > 0)
    .sort((first, second) => toNumber(second.value) - toNumber(first.value))
    .slice(0, limit)

  const maxValue = toNumber(topEntries[0]?.value)

  return topEntries.map((entry) => ({
    ...entry,
    value: toNumber(entry.value),
    width: maxValue ? Math.max(10, Math.round((toNumber(entry.value) / maxValue) * 100)) : 0,
  }))
}

async function fetchFullDataset(endpoint) {
  let currentPage = 1
  let lastPage = 1
  let total = 0
  const items = []

  do {
    const { data } = await api.get(`/${endpoint}`, {
      params: { page: currentPage, per_page: FULL_DATASET_PAGE_SIZE },
    })

    const pageItems = Array.isArray(data?.data) ? data.data : []
    items.push(...pageItems)
    total = toNumber(data?.meta?.total || total)
    lastPage = Math.max(1, toNumber(data?.meta?.last_page || 1))
    currentPage += 1
  } while (currentPage <= lastPage && currentPage <= MAX_DATASET_PAGES)

  return {
    items,
    total: total || items.length,
    blocked: false,
  }
}

async function fetchMetaDataset(endpoint) {
  const { data } = await api.get(`/${endpoint}`, {
    params: { page: 1, per_page: 1 },
  })

  return {
    items: Array.isArray(data?.data) ? data.data : [],
    total: toNumber(data?.meta?.total || 0),
    blocked: false,
  }
}

async function fetchDashboardDataset(endpoint, mode) {
  try {
    if (mode === 'meta') {
      return await fetchMetaDataset(endpoint)
    }

    return await fetchFullDataset(endpoint)
  } catch (error) {
    if (error?.response?.status === 403) {
      return {
        items: [],
        total: 0,
        blocked: true,
      }
    }

    throw error
  }
}

function useDashboardDataset(endpoint, mode = 'full') {
  return useQuery({
    queryKey: ['dashboard-dataset', endpoint, mode],
    queryFn: () => fetchDashboardDataset(endpoint, mode),
    staleTime: 60_000,
    retry: 1,
  })
}

function WidgetInfo({ label, description }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <span
      className="dashboard-widget-info-wrap"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className="dashboard-widget-info-button"
        aria-label={`Explicação: ${label}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Icon name="info" size={12} />
      </button>

      {isOpen ? (
        <span className="dashboard-widget-info-popover" role="tooltip">
          <strong>{label}</strong>
          <span>{description}</span>
        </span>
      ) : null}
    </span>
  )
}

function KpiCard({ title, value, helper, icon, tone = 'default', info }) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-${tone}`}>
      <div className="dashboard-kpi-card-head">
        <span className="kpi-icon">
          <Icon name={icon} size={16} />
        </span>
        <p>{title}</p>
        <WidgetInfo label={title} description={info || helper} />
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <small className="dashboard-kpi-helper">{helper}</small>
    </article>
  )
}

function RankingPanel({ title, subtitle, rows, valueSuffix = '', info }) {
  return (
    <article className="module-card dashboard-panel">
      <div className="section-title-row">
        <h3 className="dashboard-heading-with-info">
          {title}
          <WidgetInfo label={title} description={info || subtitle} />
        </h3>
        <p>{subtitle}</p>
      </div>

      {rows.length ? (
        <ul className="dashboard-rank-list">
          {rows.map((row) => (
            <li key={row.label} className="dashboard-rank-item">
              <div className="dashboard-rank-head">
                <div className="dashboard-rank-meta">
                  <strong>{row.label}</strong>
                  {row.note ? <span>{row.note}</span> : null}
                </div>
                <span className="dashboard-rank-value">
                  {formatNumber(row.value)}
                  {valueSuffix}
                </span>
              </div>
              <span className="dashboard-rank-track" aria-hidden="true">
                <span className="dashboard-rank-fill" style={{ width: `${row.width}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted-inline">Sem dados suficientes para ranking.</p>
      )}
    </article>
  )
}

function AlertsPanel({ title, subtitle, alerts, info }) {
  return (
    <article className="module-card dashboard-panel">
      <div className="section-title-row">
        <h3 className="dashboard-heading-with-info">
          {title}
          <WidgetInfo label={title} description={info || subtitle} />
        </h3>
        <p>{subtitle}</p>
      </div>

      {alerts.length ? (
        <ul className="dashboard-alert-list">
          {alerts.map((alert) => (
            <li key={alert.label} className={`dashboard-alert-item dashboard-alert-${alert.tone || 'neutral'}`}>
              <div>
                <strong>{alert.label}</strong>
                <small>{alert.helper}</small>
              </div>
              <span>{formatNumber(alert.value)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted-inline">Nenhum alerta crítico no momento.</p>
      )}
    </article>
  )
}

function QuickLinksPanel({ links }) {
  return (
    <article className="module-card dashboard-panel dashboard-panel-full">
      <div className="section-title-row">
        <h3 className="dashboard-heading-with-info">
          Ações de rotina
          <WidgetInfo
            label="Ações de rotina"
            description="Atalhos para abrir rapidamente os módulos mais usados no dia a dia do perfil."
          />
        </h3>
        <p>Atalhos para decisões rápidas do dia.</p>
      </div>

      <div className="dashboard-link-grid">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className="dashboard-link-card">
            <span className="kpi-icon">
              <Icon name={link.icon} size={16} />
            </span>
            <div>
              <strong>{link.label}</strong>
              <p>{link.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </article>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const selectedView = resolveRecommendedView(user?.role_name)

  const schoolsQuery = useDashboardDataset('schools')
  const usersQuery = useDashboardDataset('users')
  const subjectsQuery = useDashboardDataset('subjects')
  const classesQuery = useDashboardDataset('classes')
  const materialsQuery = useDashboardDataset('materials')
  const enrollmentsQuery = useDashboardDataset('enrollments', 'meta')

  const datasetQueries = {
    schools: schoolsQuery,
    users: usersQuery,
    subjects: subjectsQuery,
    classes: classesQuery,
    materials: materialsQuery,
    enrollments: enrollmentsQuery,
  }

  const datasets = {
    schools: schoolsQuery.data || EMPTY_DATASET,
    users: usersQuery.data || EMPTY_DATASET,
    subjects: subjectsQuery.data || EMPTY_DATASET,
    classes: classesQuery.data || EMPTY_DATASET,
    materials: materialsQuery.data || EMPTY_DATASET,
    enrollments: enrollmentsQuery.data || EMPTY_DATASET,
  }

  const schools = datasets.schools.items
  const users = datasets.users.items
  const subjects = datasets.subjects.items
  const classes = datasets.classes.items
  const materials = datasets.materials.items
  const enrollmentsTotal = datasets.enrollments.total

  const selectedViewConfig = VIEW_CONFIG[selectedView] || VIEW_CONFIG.coordenacao
  const selectedRequirements = selectedViewConfig.requirements
  const blockedRequirements = selectedRequirements.filter((datasetKey) => datasets[datasetKey].blocked)
  const loadingRequirements = selectedRequirements.filter((datasetKey) => datasetQueries[datasetKey].isPending)
  const errorRequirements = selectedRequirements.filter(
    (datasetKey) => datasetQueries[datasetKey].isError && !datasets[datasetKey].blocked,
  )
  const isRefreshing = selectedRequirements.some((datasetKey) => datasetQueries[datasetKey].isFetching)

  const selectedLastUpdate = Math.max(
    ...selectedRequirements.map((datasetKey) => datasetQueries[datasetKey].dataUpdatedAt || 0),
    0,
  )

  const lastUpdateLabel = selectedLastUpdate
    ? new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(selectedLastUpdate)
    : null

  const roleCounts = useMemo(() => {
    const counts = new Map()

    users.forEach((currentUser) => {
      const role = String(currentUser.role_name || 'Sem perfil')
      counts.set(role, (counts.get(role) || 0) + 1)
    })

    return counts
  }, [users])

  const studentsCount = roleCounts.get('Aluno') || 0
  const teachersCount = roleCounts.get('Professor') || 0
  const studentTeacherRatio = teachersCount
    ? `${(studentsCount / teachersCount).toFixed(1).replace('.', ',')}:1`
    : 'Sem base'

  const classesWithMaterialsCount = useMemo(() => {
    const linkedClasses = new Set(
      materials
        .map((material) => material.class_external_id)
        .filter(Boolean),
    )

    return linkedClasses.size
  }, [materials])

  const visibleMaterialsCount = useMemo(
    () => materials.filter((material) => Boolean(material.is_visible_to_students)).length,
    [materials],
  )

  const classesWithoutStudentsCount = useMemo(
    () => classes.filter((schoolClass) => toNumber(schoolClass.enrollments_count) === 0).length,
    [classes],
  )

  const classesWithoutSubjectsCount = useMemo(
    () => classes.filter((schoolClass) => toNumber(schoolClass.subjects_count) === 0).length,
    [classes],
  )

  const materialsWithoutClassCount = useMemo(
    () => materials.filter((material) => !material.class_external_id).length,
    [materials],
  )

  const materialsHiddenCount = Math.max(0, materials.length - visibleMaterialsCount)

  const schoolNameByExternalId = useMemo(() => {
    const map = new Map()
    schools.forEach((school) => {
      map.set(String(school.external_id), String(school.name || 'Escola sem nome'))
    })
    return map
  }, [schools])

  const topClassesByStudents = useMemo(
    () =>
      rankEntries(
        classes.map((schoolClass) => ({
          label: schoolClass.name || 'Turma sem nome',
          value: toNumber(schoolClass.enrollments_count),
          note: `${formatNumber(schoolClass.subjects_count)} disciplinas`,
        })),
      ),
    [classes],
  )

  const topSubjectsByCoverage = useMemo(
    () =>
      rankEntries(
        subjects.map((subject) => ({
          label: subject.name || 'Disciplina sem nome',
          value: toNumber(subject.classes_count),
          note: 'turmas vinculadas',
        })),
      ),
    [subjects],
  )

  const roleDistribution = useMemo(
    () =>
      rankEntries(
        Array.from(roleCounts.entries()).map(([label, value]) => ({
          label,
          value,
          note: 'usuários',
        })),
      ),
    [roleCounts],
  )

  const materialExtensions = useMemo(() => {
    const extensionCounter = new Map()

    materials.forEach((material) => {
      const extension = String(material.file_extension || 'sem extensão').toUpperCase()
      extensionCounter.set(extension, (extensionCounter.get(extension) || 0) + 1)
    })

    return rankEntries(
      Array.from(extensionCounter.entries()).map(([label, value]) => ({
        label,
        value,
        note: 'arquivos',
      })),
    )
  }, [materials])

  const schoolsByState = useMemo(() => {
    const stateCounter = new Map()

    schools.forEach((school) => {
      const state = String(school.state || 'Sem UF')
      stateCounter.set(state, (stateCounter.get(state) || 0) + 1)
    })

    return rankEntries(
      Array.from(stateCounter.entries()).map(([label, value]) => ({
        label,
        value,
        note: 'escolas',
      })),
    )
  }, [schools])

  const schoolsByType = useMemo(() => {
    const typeCounter = new Map()

    schools.forEach((school) => {
      const type = String(school.type || 'Não informado')
      typeCounter.set(type, (typeCounter.get(type) || 0) + 1)
    })

    return rankEntries(
      Array.from(typeCounter.entries()).map(([label, value]) => ({
        label,
        value,
        note: 'unidades',
      })),
    )
  }, [schools])

  const schoolOperations = useMemo(() => {
    const accumulator = new Map()

    function ensureEntry(schoolExternalId) {
      const key = schoolExternalId ? String(schoolExternalId) : '__no_school__'

      if (!accumulator.has(key)) {
        accumulator.set(key, {
          label: schoolExternalId
            ? schoolNameByExternalId.get(String(schoolExternalId)) || 'Escola não mapeada'
            : 'Sem escola',
          users: 0,
          classes: 0,
          materials: 0,
        })
      }

      return accumulator.get(key)
    }

    users.forEach((currentUser) => {
      ensureEntry(currentUser.school_external_id).users += 1
    })

    classes.forEach((schoolClass) => {
      ensureEntry(schoolClass.school_external_id).classes += 1
    })

    materials.forEach((material) => {
      ensureEntry(material.school_external_id).materials += 1
    })

    return rankEntries(
      Array.from(accumulator.values()).map((entry) => ({
        label: entry.label,
        value: entry.classes * 2 + entry.users + entry.materials,
        note: `${formatNumber(entry.classes)} turmas · ${formatNumber(entry.users)} usuários`,
      })),
      8,
    )
  }, [users, classes, materials, schoolNameByExternalId])

  const directionAlerts = [
    {
      label: 'Turmas sem alunos',
      value: classesWithoutStudentsCount,
      helper: 'Revisar criação de vínculos nas turmas novas.',
      tone: classesWithoutStudentsCount ? 'warning' : 'ok',
    },
    {
      label: 'Turmas sem disciplinas',
      value: classesWithoutSubjectsCount,
      helper: 'Mapear componentes obrigatórios por série.',
      tone: classesWithoutSubjectsCount ? 'danger' : 'ok',
    },
    {
      label: 'Materiais não visíveis',
      value: materialsHiddenCount,
      helper: 'Validar política de publicação para alunos.',
      tone: materialsHiddenCount ? 'warning' : 'ok',
    },
  ]

  const coordinatorAlerts = [
    {
      label: 'Turmas sem material',
      value: Math.max(0, classes.length - classesWithMaterialsCount),
      helper: 'Priorizar envio de conteúdo para evitar lacunas.',
      tone: classes.length > classesWithMaterialsCount ? 'warning' : 'ok',
    },
    {
      label: 'Turmas sem alunos',
      value: classesWithoutStudentsCount,
      helper: 'Verificar cronograma de matrículas e rematrículas.',
      tone: classesWithoutStudentsCount ? 'warning' : 'ok',
    },
    {
      label: 'Materiais sem turma',
      value: materialsWithoutClassCount,
      helper: 'Vincular acervo ao contexto correto de turma.',
      tone: materialsWithoutClassCount ? 'danger' : 'ok',
    },
  ]

  const adminAlerts = [
    {
      label: 'Usuários sem escola',
      value: users.filter((currentUser) => !currentUser.school_external_id).length,
      helper: 'Normalizar vínculos para tenant correto.',
      tone: users.some((currentUser) => !currentUser.school_external_id) ? 'danger' : 'ok',
    },
    {
      label: 'Escolas sem UF',
      value: schools.filter((school) => !school.state).length,
      helper: 'Completar cadastro para relatórios regionais.',
      tone: schools.some((school) => !school.state) ? 'warning' : 'ok',
    },
    {
      label: 'Usuários sem perfil',
      value: users.filter((currentUser) => !currentUser.role_name).length,
      helper: 'Revisar governança de papéis e permissões.',
      tone: users.some((currentUser) => !currentUser.role_name) ? 'warning' : 'ok',
    },
  ]

  async function handleRefresh() {
    await queryClient.invalidateQueries({ queryKey: ['dashboard-dataset'] })
  }

  const coordinatorKpis = [
    {
      title: 'Turmas monitoradas',
      value: formatNumber(classes.length),
      helper: 'Base para planejamento semanal da coordenação.',
      icon: 'class',
      tone: 'primary',
      info: 'Mostra quantas turmas você está acompanhando neste momento.',
    },
    {
      title: 'Disciplinas ativas',
      value: formatNumber(subjects.length),
      helper: 'Componentes em execução pedagógica.',
      icon: 'subject',
      tone: 'default',
      info: 'Mostra quantas disciplinas estão em uso na escola.',
    },
    {
      title: 'Matrículas totais',
      value: formatNumber(enrollmentsTotal),
      helper: 'Vínculos ativos no período atual.',
      icon: 'enrollment',
      tone: 'default',
      info: 'Mostra quantos alunos estão vinculados às turmas e disciplinas.',
    },
    {
      title: 'Cobertura de material',
      value: formatPercent(classesWithMaterialsCount, classes.length),
      helper: 'Turmas com ao menos um material vinculado.',
      icon: 'material',
      tone: 'success',
      info: 'Mostra a porcentagem de turmas que já têm material de estudo disponível.',
    },
  ]

  const directionKpis = [
    {
      title: 'Usuários ativos',
      value: formatNumber(users.length),
      helper: 'Equipe e alunos cadastrados no tenant.',
      icon: 'users',
      tone: 'primary',
      info: 'Mostra o total de pessoas cadastradas e ativas no sistema da escola.',
    },
    {
      title: 'Turmas em operação',
      value: formatNumber(classes.length),
      helper: 'Estrutura acadêmica em execução.',
      icon: 'class',
      tone: 'default',
      info: 'Mostra quantas turmas estão funcionando atualmente.',
    },
    {
      title: 'Matrículas ativas',
      value: formatNumber(enrollmentsTotal),
      helper: 'Volume operacional de vínculos.',
      icon: 'enrollment',
      tone: 'default',
      info: 'Mostra a quantidade total de matrículas em andamento.',
    },
    {
      title: 'Relação aluno/prof.',
      value: studentTeacherRatio,
      helper: 'Indicador rápido de equilíbrio pedagógico.',
      icon: 'teacher',
      tone: 'success',
      info: 'Mostra, em média, quantos alunos existem para cada professor.',
    },
  ]

  const adminKpis = [
    {
      title: 'Escolas ativas',
      value: formatNumber(schools.length),
      helper: 'Unidades cadastradas na plataforma.',
      icon: 'school',
      tone: 'primary',
      info: 'Mostra quantas escolas estão cadastradas e em uso no sistema.',
    },
    {
      title: 'Usuários totais',
      value: formatNumber(users.length),
      helper: 'Contas em operação no sistema.',
      icon: 'users',
      tone: 'default',
      info: 'Mostra o total de contas criadas para uso da plataforma.',
    },
    {
      title: 'Turmas totais',
      value: formatNumber(classes.length),
      helper: 'Oferta acadêmica consolidada.',
      icon: 'class',
      tone: 'default',
      info: 'Mostra a quantidade total de turmas registradas.',
    },
    {
      title: 'Cobertura por escola',
      value: formatPercent(
        new Set(classes.map((schoolClass) => schoolClass.school_external_id).filter(Boolean)).size,
        schools.length,
      ),
      helper: 'Escolas com turmas estruturadas.',
      icon: 'dashboard',
      tone: 'success',
      info: 'Mostra o percentual de escolas que já têm turmas organizadas.',
    },
  ]

  const canRenderSelectedView = blockedRequirements.length === 0

  return (
    <div className="dashboard-shell">
      <section className="module-card dashboard-hero">
        <div className="dashboard-hero-head">
          <div>
            <p className="dashboard-overline">Painéis de gestão escolar</p>
            <h3>Painel estratégico para acompanhamento da operação escolar.</h3>
            <span className="dashboard-lead">
              Métricas em tempo real para decidir mais rápido, corrigir gargalos e manter a operação acadêmica saudável.
            </span>
          </div>

          <div className="dashboard-hero-actions">
            <span className="pill-badge">
              <Icon name="shield" size={13} />
              Perfil: {user?.role_name || 'Sem perfil'}
            </span>

            <button type="button" className="ghost-chip" onClick={handleRefresh} disabled={isRefreshing}>
              <Icon name="session" size={14} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar dados'}
            </button>
          </div>
        </div>

        <div className="dashboard-status-row">
          <span className="pill-badge">
            <Icon name="session" size={12} />
            Visão do perfil: {VIEW_CONFIG[selectedView]?.label}
          </span>
          {lastUpdateLabel ? <span className="pill-badge">Atualizado às {lastUpdateLabel}</span> : null}
          {loadingRequirements.length ? (
            <span className="pill-badge">
              Sincronizando {loadingRequirements.length} {loadingRequirements.length > 1 ? 'fontes' : 'fonte'}
            </span>
          ) : null}
          {errorRequirements.length ? (
            <span className="pill-badge">
              Erro em {errorRequirements.map((datasetKey) => DATASET_LABELS[datasetKey]).join(', ')}
            </span>
          ) : null}
        </div>
      </section>

      {!canRenderSelectedView ? (
        <section className="module-card dashboard-access-block">
          <div className="section-title-row">
            <h3>Visão indisponível para o perfil atual</h3>
            <p>{VIEW_CONFIG[selectedView]?.label}</p>
          </div>

          <p>
            Faltam permissões para acessar: {blockedRequirements.map((datasetKey) => DATASET_LABELS[datasetKey]).join(', ')}.
          </p>
          <p className="muted-inline">
            Ajuste o perfil em <strong>Perfis</strong> e <strong>Permissões</strong> para liberar esta análise.
          </p>
        </section>
      ) : null}

      {canRenderSelectedView && selectedView === 'coordenacao' ? (
        <div id="dashboard-view-coordenacao" className="dashboard-content-stack">
          <div className="dashboard-kpi-grid">
            {coordinatorKpis.map((kpi) => (
              <KpiCard key={kpi.title} {...kpi} />
            ))}
          </div>

          <div className="dashboard-panel-grid">
            <RankingPanel
              title="Turmas com maior carga"
              subtitle="Alunos distintos vinculados por turma."
              info="Mostra quais turmas têm mais alunos, para ajudar no equilíbrio entre as salas."
              rows={topClassesByStudents}
            />
            <RankingPanel
              title="Disciplinas com maior alcance"
              subtitle="Cobertura em turmas do período."
              info="Mostra quais disciplinas chegam a mais turmas e quais ainda podem ser ampliadas."
              rows={topSubjectsByCoverage}
            />
          </div>

          <div className="dashboard-panel-grid">
            <article className="module-card dashboard-panel">
              <div className="section-title-row">
                <h3 className="dashboard-heading-with-info">
                  Saúde do acervo didático
                  <WidgetInfo
                    label="Saúde do acervo didático"
                    description="Explica se os materiais estão organizados e visíveis para os alunos das turmas."
                  />
                </h3>
                <p>Qualidade de publicação para alunos.</p>
              </div>

              <div className="dashboard-chip-stack">
                <div className="dashboard-chip-metric">
                  <strong>{formatPercent(visibleMaterialsCount, materials.length)}</strong>
                  <span>visíveis para alunos</span>
                </div>
                <div className="dashboard-chip-metric">
                  <strong>{formatNumber(materialsHiddenCount)}</strong>
                  <span>restritos à equipe</span>
                </div>
                <div className="dashboard-chip-metric">
                  <strong>{formatNumber(materials.length)}</strong>
                  <span>materiais publicados</span>
                </div>
              </div>

              <p className="dashboard-panel-subtitle">Formatos predominantes no acervo.</p>
              {materialExtensions.length ? (
                <ul className="dashboard-rank-list">
                  {materialExtensions.map((row) => (
                    <li key={row.label} className="dashboard-rank-item">
                      <div className="dashboard-rank-head">
                        <div className="dashboard-rank-meta">
                          <strong>{row.label}</strong>
                          <span>{row.note}</span>
                        </div>
                        <span className="dashboard-rank-value">{formatNumber(row.value)}</span>
                      </div>
                      <span className="dashboard-rank-track" aria-hidden="true">
                        <span className="dashboard-rank-fill" style={{ width: `${row.width}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-inline">Sem dados de formato para analisar.</p>
              )}
            </article>

            <AlertsPanel
              title="Alertas pedagógicos"
              subtitle="Pontos de atenção para o ciclo atual."
              info="Mostra problemas que precisam de atenção rápida, como turma sem alunos ou sem material."
              alerts={coordinatorAlerts}
            />
          </div>

          <QuickLinksPanel links={QUICK_LINKS.coordenacao} />
        </div>
      ) : null}

      {canRenderSelectedView && selectedView === 'direcao' ? (
        <div id="dashboard-view-direcao" className="dashboard-content-stack">
          <div className="dashboard-kpi-grid">
            {directionKpis.map((kpi) => (
              <KpiCard key={kpi.title} {...kpi} />
            ))}
          </div>

          <div className="dashboard-panel-grid">
            <RankingPanel
              title="Composição por perfil"
              subtitle="Distribuição de usuários por função."
              info="Mostra como as pessoas estão distribuídas por perfil (ex.: aluno, professor, coordenação)."
              rows={roleDistribution}
            />
            <RankingPanel
              title="Lotação de turmas"
              subtitle="Classes com maior volume de alunos."
              info="Mostra as turmas mais cheias para facilitar decisões de organização e capacidade."
              rows={topClassesByStudents}
            />
          </div>

          <div className="dashboard-panel-grid">
            <article className="module-card dashboard-panel">
              <div className="section-title-row">
                <h3 className="dashboard-heading-with-info">
                  Publicação de materiais
                  <WidgetInfo
                    label="Publicação de materiais"
                    description="Ajuda a acompanhar se os materiais estão disponíveis para os alunos ou apenas para a equipe."
                  />
                </h3>
                <p>Controle de conteúdo para equipe e estudantes.</p>
              </div>

              <div className="dashboard-chip-stack">
                <div className="dashboard-chip-metric">
                  <strong>{formatNumber(visibleMaterialsCount)}</strong>
                  <span>visíveis para alunos</span>
                </div>
                <div className="dashboard-chip-metric">
                  <strong>{formatNumber(materialsHiddenCount)}</strong>
                  <span>uso interno</span>
                </div>
                <div className="dashboard-chip-metric">
                  <strong>{formatNumber(enrollmentsTotal)}</strong>
                  <span>matrículas ativas</span>
                </div>
              </div>

              <p className="dashboard-panel-subtitle">Extensões mais frequentes no acervo.</p>
              {materialExtensions.length ? (
                <ul className="dashboard-rank-list">
                  {materialExtensions.map((row) => (
                    <li key={row.label} className="dashboard-rank-item">
                      <div className="dashboard-rank-head">
                        <div className="dashboard-rank-meta">
                          <strong>{row.label}</strong>
                          <span>{row.note}</span>
                        </div>
                        <span className="dashboard-rank-value">{formatNumber(row.value)}</span>
                      </div>
                      <span className="dashboard-rank-track" aria-hidden="true">
                        <span className="dashboard-rank-fill" style={{ width: `${row.width}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-inline">Sem dados de formato para analisar.</p>
              )}
            </article>

            <AlertsPanel
              title="Risco operacional"
              subtitle="Itens que afetam execução pedagógica."
              info="Mostra pontos que podem atrapalhar o funcionamento da escola no dia a dia."
              alerts={directionAlerts}
            />
          </div>

          <QuickLinksPanel links={QUICK_LINKS.direcao} />
        </div>
      ) : null}

      {canRenderSelectedView && selectedView === 'admin' ? (
        <div id="dashboard-view-admin" className="dashboard-content-stack">
          <div className="dashboard-kpi-grid">
            {adminKpis.map((kpi) => (
              <KpiCard key={kpi.title} {...kpi} />
            ))}
          </div>

          <div className="dashboard-panel-grid">
            <RankingPanel
              title="Performance por escola"
              subtitle="Peso combinado de turmas, usuários e materiais."
              info="Compara as escolas pelo uso da plataforma para identificar onde acompanhar mais de perto."
              rows={schoolOperations}
            />
            <RankingPanel
              title="Distribuição por estado"
              subtitle="Cobertura geográfica das unidades."
              info="Mostra em quais estados as escolas estão concentradas."
              rows={schoolsByState}
            />
          </div>

          <div className="dashboard-panel-grid">
            <RankingPanel
              title="Perfil das unidades"
              subtitle="Classificação de tipos de escola."
              info="Mostra o tipo de cada escola para facilitar visão geral da rede."
              rows={schoolsByType}
            />
            <AlertsPanel
              title="Governança de dados"
              subtitle="Inconsistências cadastrais para correção."
              info="Aponta cadastros incompletos ou inconsistentes que precisam ser corrigidos."
              alerts={adminAlerts}
            />
          </div>

          <QuickLinksPanel links={QUICK_LINKS.admin} />
        </div>
      ) : null}
    </div>
  )
}
