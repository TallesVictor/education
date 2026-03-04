import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

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
    { title: 'Usuários', value: users.data ?? 0 },
    { title: 'Escolas', value: schools.data ?? 0 },
    { title: 'Disciplinas', value: subjects.data ?? 0 },
    { title: 'Turmas', value: classes.data ?? 0 },
  ]

  return (
    <div>
      <div className="hero-panel">
        <p>Ambiente Multi-Tenant com Laravel + React</p>
        <h3>Operação diária centralizada em um único painel.</h3>
      </div>

      <div className="kpi-grid">
        {cards.map((card) => (
          <article key={card.title} className="kpi-card">
            <p>{card.title}</p>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>
    </div>
  )
}
