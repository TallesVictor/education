import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../api/client'
import { CrudModule } from '../components/CrudModule'

const schema = z.object({
  school_external_id: z.string().optional(),
  name: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
})

export function ClassesPage() {
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

  return (
    <CrudModule
      title="Turma"
      endpoint="classes"
      columns={[
        { key: 'name', label: 'Nome' },
        { key: 'school_name', label: 'Escola' },
        { key: 'year', label: 'Ano' },
        { key: 'enrollments_count', label: 'Alunos' },
      ]}
      schema={schema}
      initialValues={{
        school_external_id: '',
        name: '',
        year: new Date().getFullYear(),
      }}
      fields={[
        {
          name: 'school_external_id',
          label: 'Escola',
          type: 'select',
          options: schoolOptions,
        },
        { name: 'name', label: 'Nome *' },
        { name: 'year', label: 'Ano *', type: 'number' },
      ]}
    />
  )
}
