import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../api/client'
import { PaginationControls } from '../components/PaginationControls'
import { AttributeSearchFilter } from '../components/AttributeSearchFilter'
import { useToast } from '../hooks/useToast'
import { Icon } from '../components/Icon'

const individualSchema = z.object({
  user_external_id: z.string().min(1, 'Aluno é obrigatório.'),
  class_external_id: z.string().min(1, 'Turma é obrigatória.'),
  subject_external_id: z.string().min(1, 'Disciplina é obrigatória.'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

const bulkSchema = z.object({
  class_external_id: z.string().min(1, 'Turma é obrigatória.'),
  subject_external_id: z.string().min(1, 'Disciplina é obrigatória.'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

const individualDefaults = {
  user_external_id: '',
  class_external_id: '',
  subject_external_id: '',
  start_date: '',
  end_date: '',
}

const bulkDefaults = {
  class_external_id: '',
  subject_external_id: '',
  start_date: '',
  end_date: '',
}

export function EnrollmentsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [page, setPage] = useState(1)
  const [activeFilters, setActiveFilters] = useState([])

  const individualForm = useForm({
    resolver: zodResolver(individualSchema),
    defaultValues: individualDefaults,
  })

  const bulkForm = useForm({
    resolver: zodResolver(bulkSchema),
    defaultValues: bulkDefaults,
  })

  const enrollmentsQuery = useQuery({
    queryKey: ['enrollments', page, activeFilters],
    queryFn: async () => {
      const { data } = await api.get('/enrollments', {
        params: { page, per_page: 15, ...buildEnrollmentFilterParams(activeFilters) },
      })
      return {
        data: data.data,
        meta: data.meta,
      }
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
    mutationFn: async (payload) => {
      await api.post('/enrollments', payload)
    },
    onSuccess: async () => {
      setIsFormModalOpen(false)
      individualForm.reset(individualDefaults)
      setStatusMessage('Matrícula individual criada com sucesso.')
      toast.success('Matrícula individual criada com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    },
    onError: () => {
      setStatusMessage('Não foi possível criar a matrícula individual.')
      toast.error('Não foi possível criar a matrícula individual.')
    },
  })

  const bulkEnrollmentMutation = useMutation({
    mutationFn: async (payload) => {
      await api.post('/enrollments/bulk', payload)
    },
    onSuccess: async () => {
      setIsFormModalOpen(false)
      bulkForm.reset(bulkDefaults)
      setSelectedStudentIds([])
      setStatusMessage('Matrículas em lote processadas com sucesso.')
      toast.success('Matrículas em lote processadas com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    },
    onError: () => {
      setStatusMessage('Não foi possível processar as matrículas em lote.')
      toast.error('Não foi possível processar as matrículas em lote.')
    },
  })

  const deleteEnrollmentMutation = useMutation({
    mutationFn: async (externalId) => {
      await api.delete(`/enrollments/${externalId}`)
    },
    onSuccess: async () => {
      setStatusMessage('Matrícula removida com sucesso.')
      toast.success('Matrícula removida com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    },
    onError: () => {
      setStatusMessage('Não foi possível remover a matrícula.')
      toast.error('Não foi possível remover a matrícula.')
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

  const enrollmentFilterDefinitions = useMemo(
    () => [
      {
        key: 'user_name',
        label: 'Aluno',
        aliases: ['aluno', 'user', 'nome'],
        type: 'text',
        theme: 'name',
      },
      {
        key: 'class_external_id',
        label: 'Turma',
        aliases: ['turma', 'class'],
        type: 'select',
        theme: 'class',
        keepAttributeInInput: true,
        options: (classesQuery.data ?? []).map((schoolClass) => ({
          value: schoolClass.external_id,
          label: schoolClass.name,
        })),
      },
      {
        key: 'subject_external_id',
        label: 'Disciplina',
        aliases: ['disciplina', 'subject'],
        type: 'select',
        theme: 'description',
        keepAttributeInInput: true,
        options: (subjectsQuery.data ?? []).map((subject) => ({
          value: subject.external_id,
          label: subject.name,
        })),
      },
    ],
    [classesQuery.data, subjectsQuery.data],
  )

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

  const submitIndividual = individualForm.handleSubmit((values) => {
    saveEnrollmentMutation.mutate(values)
  })

  const submitBulk = bulkForm.handleSubmit((values) => {
    if (selectedStudentIds.length === 0) {
      setStatusMessage('Selecione ao menos um aluno para o vínculo em lote.')
      toast.info('Selecione ao menos um aluno para o vínculo em lote.')
      return
    }

    bulkEnrollmentMutation.mutate({
      ...values,
      student_external_ids: selectedStudentIds,
    })
  })

  return (
    <div className="module-stack">
      <section className="module-card">
        <div className="section-title-row">
          <h3>Matrículas</h3>
          <p>{enrollmentsQuery.data?.meta?.total ?? 0} vínculos ativos</p>
        </div>

        <div className="actions-row module-toolbar-actions">
          <button type="button" onClick={() => setIsFormModalOpen(true)}>
            <Icon name="add" size={14} />
            Cadastrar matrícula
          </button>
        </div>

        <AttributeSearchFilter
          definitions={enrollmentFilterDefinitions}
          activeFilters={activeFilters}
          onChange={(nextFilters) => {
            setPage(1)
            setActiveFilters(nextFilters)
          }}
          placeholder="Filtrar matrículas... ex.: aluno:maria"
        />

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
              {(enrollmentsQuery.data?.data ?? []).map((enrollment) => (
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
                      <Icon name="unlink" size={14} />
                      Desvincular
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationControls
          meta={enrollmentsQuery.data?.meta}
          onPageChange={(nextPage) => setPage(Math.max(1, nextPage))}
        />
      </section>

      {isFormModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsFormModalOpen(false)}>
          <section
            className="module-card modal-card import-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Cadastro de matrículas"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-title-row">
              <h3>Cadastro de Matrículas</h3>
              <button type="button" className="ghost-chip" onClick={() => setIsFormModalOpen(false)}>
                Fechar
              </button>
            </div>

            <div className="module-grid">
              <section className="module-card">
                <div className="section-title-row">
                  <h3>Vínculo Individual</h3>
                  <p>Aluno + Turma + Disciplina</p>
                </div>

                <form className="stack-form" onSubmit={submitIndividual}>
                  <label className="form-span-12">
                    <span>Aluno *</span>
                    <select {...individualForm.register('user_external_id')}>
                      <option value="">Selecione</option>
                      {(studentsQuery.data ?? []).map((student) => (
                        <option key={student.external_id} value={student.external_id}>
                          {student.display_name} ({student.email})
                        </option>
                      ))}
                    </select>
                    {individualForm.formState.errors.user_external_id && (
                      <small className="error-text">
                        {individualForm.formState.errors.user_external_id.message}
                      </small>
                    )}
                  </label>

                  <label className="form-span-6">
                    <span>Turma *</span>
                    <select {...individualForm.register('class_external_id')}>
                      <option value="">Selecione</option>
                      {(classesQuery.data ?? []).map((schoolClass) => (
                        <option key={schoolClass.external_id} value={schoolClass.external_id}>
                          {schoolClass.name}
                        </option>
                      ))}
                    </select>
                    {individualForm.formState.errors.class_external_id && (
                      <small className="error-text">
                        {individualForm.formState.errors.class_external_id.message}
                      </small>
                    )}
                  </label>

                  <label className="form-span-6">
                    <span>Disciplina *</span>
                    <select {...individualForm.register('subject_external_id')}>
                      <option value="">Selecione</option>
                      {(subjectsQuery.data ?? []).map((subject) => (
                        <option key={subject.external_id} value={subject.external_id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                    {individualForm.formState.errors.subject_external_id && (
                      <small className="error-text">
                        {individualForm.formState.errors.subject_external_id.message}
                      </small>
                    )}
                  </label>

                  <label className="form-span-3">
                    <span>Início</span>
                    <input type="date" {...individualForm.register('start_date')} />
                  </label>

                  <label className="form-span-3">
                    <span>Fim</span>
                    <input type="date" {...individualForm.register('end_date')} />
                  </label>

                  <button type="submit" disabled={saveEnrollmentMutation.isPending}>
                    <Icon name="save" size={14} />
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
                  <label className="form-span-6">
                    <span>Turma *</span>
                    <select {...bulkForm.register('class_external_id')}>
                      <option value="">Selecione</option>
                      {(classesQuery.data ?? []).map((schoolClass) => (
                        <option key={schoolClass.external_id} value={schoolClass.external_id}>
                          {schoolClass.name}
                        </option>
                      ))}
                    </select>
                    {bulkForm.formState.errors.class_external_id && (
                      <small className="error-text">{bulkForm.formState.errors.class_external_id.message}</small>
                    )}
                  </label>

                  <label className="form-span-6">
                    <span>Disciplina *</span>
                    <select {...bulkForm.register('subject_external_id')}>
                      <option value="">Selecione</option>
                      {(subjectsQuery.data ?? []).map((subject) => (
                        <option key={subject.external_id} value={subject.external_id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                    {bulkForm.formState.errors.subject_external_id && (
                      <small className="error-text">{bulkForm.formState.errors.subject_external_id.message}</small>
                    )}
                  </label>

                  <label className="form-span-12">
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
                      <Icon name={areAllStudentsSelected ? 'close' : 'add'} size={14} />
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

                  <label className="form-span-3">
                    <span>Início</span>
                    <input type="date" {...bulkForm.register('start_date')} />
                  </label>

                  <label className="form-span-3">
                    <span>Fim</span>
                    <input type="date" {...bulkForm.register('end_date')} />
                  </label>

                  <button type="submit" disabled={bulkEnrollmentMutation.isPending}>
                    <Icon name="save" size={14} />
                    {bulkEnrollmentMutation.isPending ? 'Processando...' : 'Confirmar lote'}
                  </button>
                </form>
              </section>
            </div>
          </section>
        </div>
      )}

      {statusMessage && <p className="status-text">{statusMessage}</p>}
    </div>
  )
}

function buildEnrollmentFilterParams(activeFilters) {
  const params = {}

  for (const filter of activeFilters) {
    const paramName = `filter_${filter.attribute}`
    const currentValue = params[paramName]

    if (currentValue === undefined) {
      params[paramName] = filter.value
      continue
    }

    params[paramName] = Array.isArray(currentValue)
      ? [...currentValue, filter.value]
      : [currentValue, filter.value]
  }

  return params
}
