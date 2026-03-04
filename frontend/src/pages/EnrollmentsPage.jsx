import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

const enrollmentInitialValues = {
  user_external_id: '',
  class_external_id: '',
  subject_external_id: '',
  start_date: '',
  end_date: '',
}

const bulkInitialValues = {
  class_external_id: '',
  subject_external_id: '',
  start_date: '',
  end_date: '',
}

export function EnrollmentsPage() {
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState('')
  const [enrollmentForm, setEnrollmentForm] = useState(enrollmentInitialValues)
  const [bulkForm, setBulkForm] = useState(bulkInitialValues)
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState([])

  const enrollmentsQuery = useQuery({
    queryKey: ['enrollments'],
    queryFn: async () => {
      const { data } = await api.get('/enrollments', { params: { per_page: 200 } })
      return data.data
    },
  })

  const classesQuery = useQuery({
    queryKey: ['classes-enrollment'],
    queryFn: async () => {
      const { data } = await api.get('/classes', { params: { per_page: 200 } })
      return data.data
    },
  })

  const subjectsQuery = useQuery({
    queryKey: ['subjects-enrollment'],
    queryFn: async () => {
      const { data } = await api.get('/subjects', { params: { per_page: 200 } })
      return data.data
    },
  })

  const studentsQuery = useQuery({
    queryKey: ['students-enrollment', studentSearch],
    queryFn: async () => {
      const { data } = await api.get('/users', {
        params: {
          name: studentSearch,
          per_page: 200,
        },
      })

      return data.data
    },
  })

  const saveEnrollmentMutation = useMutation({
    mutationFn: async () => {
      await api.post('/enrollments', enrollmentForm)
    },
    onSuccess: async () => {
      setEnrollmentForm(enrollmentInitialValues)
      setStatusMessage('Matrícula individual criada com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    },
    onError: () => {
      setStatusMessage('Não foi possível criar a matrícula individual.')
    },
  })

  const bulkEnrollmentMutation = useMutation({
    mutationFn: async () => {
      await api.post('/enrollments/bulk', {
        ...bulkForm,
        student_external_ids: selectedStudentIds,
      })
    },
    onSuccess: async () => {
      setSelectedStudentIds([])
      setStatusMessage('Matrículas em lote processadas com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    },
    onError: () => {
      setStatusMessage('Não foi possível processar as matrículas em lote.')
    },
  })

  const deleteEnrollmentMutation = useMutation({
    mutationFn: async (externalId) => {
      await api.delete(`/enrollments/${externalId}`)
    },
    onSuccess: async () => {
      setStatusMessage('Matrícula removida com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    },
    onError: () => {
      setStatusMessage('Não foi possível remover a matrícula.')
    },
  })

  const students = useMemo(() => {
    const rows = studentsQuery.data ?? []

    if (!studentSearch) {
      return rows.slice(0, 40)
    }

    return rows
  }, [studentSearch, studentsQuery.data])

  const areAllStudentsSelected = useMemo(() => {
    if (students.length === 0) {
      return false
    }

    return students.every((student) => selectedStudentIds.includes(student.external_id))
  }, [students, selectedStudentIds])

  function handleEnrollmentFieldChange(event) {
    const { name, value } = event.target
    setEnrollmentForm((current) => ({ ...current, [name]: value }))
  }

  function handleBulkFieldChange(event) {
    const { name, value } = event.target
    setBulkForm((current) => ({ ...current, [name]: value }))
  }

  function toggleStudent(studentExternalId) {
    setSelectedStudentIds((current) => {
      if (current.includes(studentExternalId)) {
        return current.filter((id) => id !== studentExternalId)
      }

      return [...current, studentExternalId]
    })
  }

  function toggleSelectAllVisibleStudents() {
    const visibleIds = students.map((student) => student.external_id)

    setSelectedStudentIds((current) => {
      const next = new Set(current)

      if (areAllStudentsSelected) {
        visibleIds.forEach((id) => next.delete(id))
      } else {
        visibleIds.forEach((id) => next.add(id))
      }

      return Array.from(next)
    })
  }

  function submitIndividual(event) {
    event.preventDefault()
    saveEnrollmentMutation.mutate()
  }

  function submitBulk(event) {
    event.preventDefault()

    if (selectedStudentIds.length === 0) {
      setStatusMessage('Selecione ao menos um aluno para o vínculo em lote.')
      return
    }

    bulkEnrollmentMutation.mutate()
  }

  return (
    <div className="module-stack">
      <section className="module-card">
        <div className="section-title-row">
          <h3>Matrículas</h3>
          <p>{enrollmentsQuery.data?.length ?? 0} vínculos ativos</p>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Turma</th>
                <th>Disciplina</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(enrollmentsQuery.data ?? []).map((enrollment) => (
                <tr key={enrollment.external_id}>
                  <td>{enrollment.user_name}</td>
                  <td>{enrollment.class_name}</td>
                  <td>{enrollment.subject_name}</td>
                  <td>{enrollment.start_date || '-'}</td>
                  <td>{enrollment.end_date || '-'}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteEnrollmentMutation.mutate(enrollment.external_id)}
                    >
                      Desvincular
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="module-grid">
        <section className="module-card">
          <div className="section-title-row">
            <h3>Vínculo Individual</h3>
            <p>Aluno + Turma + Disciplina</p>
          </div>

          <form className="stack-form" onSubmit={submitIndividual}>
            <label>
              <span>Aluno *</span>
              <select
                name="user_external_id"
                value={enrollmentForm.user_external_id}
                onChange={handleEnrollmentFieldChange}
                required
              >
                <option value="">Selecione</option>
                {(studentsQuery.data ?? []).map((student) => (
                  <option key={student.external_id} value={student.external_id}>
                    {student.display_name} ({student.email})
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Turma *</span>
              <select
                name="class_external_id"
                value={enrollmentForm.class_external_id}
                onChange={handleEnrollmentFieldChange}
                required
              >
                <option value="">Selecione</option>
                {(classesQuery.data ?? []).map((schoolClass) => (
                  <option key={schoolClass.external_id} value={schoolClass.external_id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Disciplina *</span>
              <select
                name="subject_external_id"
                value={enrollmentForm.subject_external_id}
                onChange={handleEnrollmentFieldChange}
                required
              >
                <option value="">Selecione</option>
                {(subjectsQuery.data ?? []).map((subject) => (
                  <option key={subject.external_id} value={subject.external_id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Início</span>
              <input
                type="date"
                name="start_date"
                value={enrollmentForm.start_date}
                onChange={handleEnrollmentFieldChange}
              />
            </label>

            <label>
              <span>Fim</span>
              <input
                type="date"
                name="end_date"
                value={enrollmentForm.end_date}
                onChange={handleEnrollmentFieldChange}
              />
            </label>

            <button type="submit" disabled={saveEnrollmentMutation.isPending}>
              {saveEnrollmentMutation.isPending ? 'Salvando...' : 'Salvar vínculo'}
            </button>
          </form>
        </section>

        <section className="module-card">
          <div className="section-title-row">
            <h3>Vínculo em Lote</h3>
            <p>Busca + seleção múltipla</p>
          </div>

          <form className="stack-form" onSubmit={submitBulk}>
            <label>
              <span>Turma *</span>
              <select
                name="class_external_id"
                value={bulkForm.class_external_id}
                onChange={handleBulkFieldChange}
                required
              >
                <option value="">Selecione</option>
                {(classesQuery.data ?? []).map((schoolClass) => (
                  <option key={schoolClass.external_id} value={schoolClass.external_id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Disciplina *</span>
              <select
                name="subject_external_id"
                value={bulkForm.subject_external_id}
                onChange={handleBulkFieldChange}
                required
              >
                <option value="">Selecione</option>
                {(subjectsQuery.data ?? []).map((subject) => (
                  <option key={subject.external_id} value={subject.external_id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Buscar aluno por nome/e-mail</span>
              <input
                type="text"
                placeholder="Digite para filtrar"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
              />
            </label>

            <div className="section-title-row">
              <p>{selectedStudentIds.length} selecionados</p>
              <button type="button" className="ghost-chip" onClick={toggleSelectAllVisibleStudents}>
                {areAllStudentsSelected ? 'Desmarcar visíveis' : 'Selecionar visíveis'}
              </button>
            </div>

            <div className="checklist-box">
              {students.map((student) => (
                <label key={student.external_id} className="checkbox-line">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.external_id)}
                    onChange={() => toggleStudent(student.external_id)}
                  />
                  <span>{student.display_name}</span>
                  <code>{student.email}</code>
                </label>
              ))}
            </div>

            <label>
              <span>Início</span>
              <input
                type="date"
                name="start_date"
                value={bulkForm.start_date}
                onChange={handleBulkFieldChange}
              />
            </label>

            <label>
              <span>Fim</span>
              <input
                type="date"
                name="end_date"
                value={bulkForm.end_date}
                onChange={handleBulkFieldChange}
              />
            </label>

            <button type="submit" disabled={bulkEnrollmentMutation.isPending}>
              {bulkEnrollmentMutation.isPending ? 'Processando...' : 'Confirmar lote'}
            </button>
          </form>
        </section>
      </div>

      {statusMessage && <p className="status-text">{statusMessage}</p>}
    </div>
  )
}
