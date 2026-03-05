import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../api/client'
import { CrudModule } from '../components/CrudModule'
import { Icon } from '../components/Icon'

const schema = z.object({
  school_external_id: z.string().optional(),
  name: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  subject_external_ids: z.array(z.string()).optional(),
})

export function ClassesPage() {
  const navigate = useNavigate()

  const schoolsQuery = useQuery({
    queryKey: ['schools-classes'],
    queryFn: async () => {
      const { data } = await api.get('/schools')
      return data.data
    },
  })

  const schoolOptions = useMemo(
    () =>
      (schoolsQuery.data ?? []).map((school) => ({
        value: school.external_id,
        label: school.name,
      })),
    [schoolsQuery.data],
  )

  const subjectsQuery = useQuery({
    queryKey: ['subjects-classes'],
    queryFn: async () => {
      const { data } = await api.get('/subjects', { params: { per_page: 200 } })
      return data.data
    },
  })

  const subjectOptions = useMemo(
    () =>
      (subjectsQuery.data ?? []).map((subject) => ({
        value: subject.external_id,
        label: subject.name,
      })),
    [subjectsQuery.data],
  )

  return (
    <CrudModule
      title="Turma"
      endpoint="classes"
      formVariant="modal"
      renderListActions={({ openCreateForm }) => (
        <button type="button" onClick={openCreateForm}>
          <Icon name="add" size={14} />
          Cadastrar turma
        </button>
      )}
      onRowClick={(row) => navigate(`/classes/${row.external_id}`)}
      columns={[
        { key: 'name', label: 'Nome' },
        { key: 'school_name', label: 'Escola' },
        { key: 'year', label: 'Ano' },
        { key: 'enrollments_count', label: 'Alunos' },
        { key: 'subjects_count', label: 'Disciplinas' },
      ]}
      attributeFilters={[
        {
          key: 'name',
          label: 'Nome',
          aliases: ['nome', 'name'],
          type: 'text',
          theme: 'name',
        },
        {
          key: 'year',
          label: 'Ano',
          aliases: ['ano', 'year'],
          type: 'text',
          theme: 'school',
        },
        {
          key: 'school_external_id',
          label: 'Escola',
          aliases: ['escola', 'school'],
          type: 'select',
          theme: 'school',
          options: schoolOptions,
        },
      ]}
      schema={schema}
      initialValues={{
        school_external_id: '',
        name: '',
        year: new Date().getFullYear(),
        subject_external_ids: [],
      }}
      fields={[
        {
          name: 'school_external_id',
          label: 'Escola',
          type: 'select',
          span: 6,
          options: schoolOptions,
        },
        { name: 'name', label: 'Nome *', span: 6 },
        { name: 'year', label: 'Ano *', type: 'number', span: 4 },
        {
          name: 'subject_external_ids',
          label: 'Disciplinas',
          type: 'multiselect',
          span: 12,
          options: subjectOptions,
          getValue: (row) => (row.subjects ?? []).map((subject) => subject.external_id),
        },
      ]}
      transformSubmit={(values) => ({
        ...values,
        year: Number(values.year),
        subject_external_ids: Array.isArray(values.subject_external_ids)
          ? values.subject_external_ids
          : [],
      })}
    />
  )
}
