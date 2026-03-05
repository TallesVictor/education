import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { Icon } from '../components/Icon'

function useCount(endpoint) {
  return useQuery({
    queryKey: ['count', endpoint],
    queryFn: async () => {
      const { data } = await api.get(`/${endpoint}`)
      return data.meta?.total ?? data.data?.length ?? 0
    },
  })
}

export function DashboardPage() {
  const users = useCount('users')
  const schools = useCount('schools')
  const subjects = useCount('subjects')
  const classes = useCount('classes')

  const cards = [
    {
      title: 'Usuários',
      value: users.data ?? 0,
      icon: 'users',
      helper: 'Gestão de contas ativas',
    },
    {
      title: 'Escolas',
      value: schools.data ?? 0,
      icon: 'school',
      helper: 'Unidades conectadas',
    },
    {
      title: 'Disciplinas',
      value: subjects.data ?? 0,
      icon: 'subject',
      helper: 'Componentes curriculares',
    },
    {
      title: 'Turmas',
      value: classes.data ?? 0,
      icon: 'class',
      helper: 'Turmas em operação',
    },
  ]

  return (
    <div>
      <div className="hero-panel hero-panel-dashboard">
        <div>
          <p>RSoft Education</p>
          <h3>Painel moderno para coordenar rotina escolar com mais clareza.</h3>
          <span className="muted-inline">Dados centralizados para decisão rápida da equipe pedagógica.</span>
        </div>

        <div className="hero-chip-row">
          <span className="hero-chip">
            <Icon name="school" size={14} />
            Escola
          </span>
          <span className="hero-chip">
            <Icon name="teacher" size={14} />
            Professores
          </span>
          <span className="hero-chip">
            <Icon name="student" size={14} />
            Alunos
          </span>
        </div>
      </div>

      <div className="kpi-grid">
        {cards.map((card) => (
          <article key={card.title} className="kpi-card">
            <div className="kpi-card-head">
              <span className="kpi-icon">
                <Icon name={card.icon} size={16} />
              </span>
              <p>{card.title}</p>
            </div>
            <strong>{card.value}</strong>
            <small>{card.helper}</small>
          </article>
        ))}
      </div>

      <div className="audience-grid">
        <article className="audience-card">
          <span className="kpi-icon">
            <Icon name="school" size={16} />
          </span>
          <h4>Gestão Escolar</h4>
          <p>Organize unidades, turmas e cadastro institucional sem retrabalho.</p>
        </article>

        <article className="audience-card">
          <span className="kpi-icon">
            <Icon name="teacher" size={16} />
          </span>
          <h4>Equipe Docente</h4>
          <p>Visual rápido de disciplinas e matrículas para apoiar planejamento de aula.</p>
        </article>

        <article className="audience-card">
          <span className="kpi-icon">
            <Icon name="student" size={16} />
          </span>
          <h4>Jornada do Aluno</h4>
          <p>Controle contínuo de vínculos acadêmicos e status por turma.</p>
        </article>
      </div>
    </div>
  )
}
