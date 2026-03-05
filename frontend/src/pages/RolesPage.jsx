import { z } from 'zod'
import { CrudModule } from '../components/CrudModule'

const schema = z.object({
  name: z.string().min(1),
  is_system: z.string().optional(),
})

export function RolesPage() {
  return (
    <CrudModule
      title="Perfil"
      endpoint="roles"
      columns={[
        { key: 'name', label: 'Nome' },
        {
          key: 'is_system',
          label: 'Sistema',
          render: (row) => (
            <span className="pill-badge">{row.is_system ? 'Sistema' : 'Custom'}</span>
          ),
        },
      ]}
      schema={schema}
      initialValues={{
        name: '',
        is_system: 'false',
      }}
      fields={[
        { name: 'name', label: 'Nome *' },
        {
          name: 'is_system',
          label: 'Perfil de sistema',
          type: 'select',
          options: [
            { value: 'false', label: 'Não' },
            { value: 'true', label: 'Sim' },
          ],
        },
      ]}
      transformSubmit={(values) => ({
        ...values,
        is_system: values.is_system === 'true',
      })}
    />
  )
}
