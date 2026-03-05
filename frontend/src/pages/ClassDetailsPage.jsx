import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function ClassDetailsPage() {
  const { external_id: externalId } = useParams()

  const classDetailsQuery = useQuery({
    queryKey: ['class-details', externalId],
    enabled: Boolean(externalId),
    queryFn: async () => {
      const { data } = await api.get(`/classes/${externalId}`)
      return data.data
    },
  })

  const classDetails = classDetailsQuery.data
  const classUsers = classDetails?.users ?? []
  const classSubjects = classDetails?.subjects ?? []

  return (
    <div className="module-stack">
      <section className="module-card">
        <div className="section-title-row">
          <h3>Detalhes da Turma</h3>
          <Link to="/classes" className="ghost-link">
            Voltar para turmas
          </Link>
        </div>

        {classDetailsQuery.isLoading && <p>Carregando detalhes...</p>}
        {classDetailsQuery.isError && <p>Não foi possível carregar os detalhes da turma.</p>}

        {!classDetailsQuery.isLoading && !classDetailsQuery.isError && classDetails && (
          <>
            <div className="class-detail-grid">
              <div className="class-detail-card">
                <p className="muted-inline">Turma</p>
                <strong>{classDetails.name}</strong>
              </div>
              <div className="class-detail-card">
                <p className="muted-inline">Escola</p>
                <strong>{classDetails.school_name || '-'}</strong>
              </div>
              <div className="class-detail-card">
                <p className="muted-inline">Ano</p>
                <strong>{classDetails.year}</strong>
              </div>
              <div className="class-detail-card">
                <p className="muted-inline">Alunos</p>
                <strong>{classDetails.enrollments_count ?? classUsers.length}</strong>
              </div>
            </div>

            <div className="class-subjects-row">
              <p className="muted-inline">Disciplinas</p>
              <div className="actions-row">
                {classSubjects.length === 0 && <span className="pill-badge">Sem disciplinas</span>}
                {classSubjects.map((subject) => (
                  <span key={subject.external_id} className="pill-badge">
                    {subject.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="section-title-row">
              <h3>Usuários da turma</h3>
              <p>{classUsers.length} usuários</p>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>CPF</th>
                    <th>Telefone</th>
                  </tr>
                </thead>
                <tbody>
                  {classUsers.length === 0 && (
                    <tr>
                      <td colSpan={4}>Nenhum usuário matriculado nesta turma.</td>
                    </tr>
                  )}
                  {classUsers.map((user) => (
                    <tr key={user.external_id}>
                      <td>{user.display_name || user.name}</td>
                      <td>{user.email || '-'}</td>
                      <td>{user.cpf || '-'}</td>
                      <td>{user.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
