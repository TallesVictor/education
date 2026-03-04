import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export function CrudModule({
  title,
  endpoint,
  columns,
  fields,
  schema,
  initialValues,
  transformSubmit,
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(null)

  const listQuery = useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      const { data } = await api.get(`/${endpoint}`)
      return data.data
    },
  })

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      const payload = transformSubmit ? transformSubmit(values) : values

      if (editing) {
        await api.put(`/${endpoint}/${editing.external_id}`, payload)
      } else {
        await api.post(`/${endpoint}`, payload)
      }
    },
    onSuccess: async () => {
      setEditing(null)
      form.reset(initialValues)
      await queryClient.invalidateQueries({ queryKey: [endpoint] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (externalId) => {
      await api.delete(`/${endpoint}/${externalId}`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [endpoint] })
    },
  })

  function onEdit(item) {
    setEditing(item)

    for (const field of fields) {
      form.setValue(field.name, item[field.name] ?? '')
    }
  }

  function onCancelEdit() {
    setEditing(null)
    form.reset(initialValues)
  }

  return (
    <div className="module-grid">
      <section className="module-card">
        <div className="section-title-row">
          <h3>{title}</h3>
          <p>{listQuery.data?.length ?? 0} registros</p>
        </div>

        {listQuery.isLoading && <p>Carregando...</p>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(listQuery.data ?? []).map((row) => (
                <tr key={row.external_id}>
                  {columns.map((column) => (
                    <td key={column.key}>{row[column.key] ?? '-'}</td>
                  ))}
                  <td className="actions-cell">
                    <button type="button" onClick={() => onEdit(row)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteMutation.mutate(row.external_id)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="module-card">
        <div className="section-title-row">
          <h3>{editing ? `Editar ${title}` : `Novo ${title}`}</h3>
          {editing && (
            <button type="button" onClick={onCancelEdit}>
              Cancelar edição
            </button>
          )}
        </div>

        <form
          className="stack-form"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        >
          {fields.map((field) => (
            <label key={field.name}>
              <span>{field.label}</span>

              {field.type === 'textarea' && (
                <textarea rows={4} {...form.register(field.name)} />
              )}

              {field.type === 'select' && (
                <select {...form.register(field.name)}>
                  <option value="">Selecione</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              {!['textarea', 'select'].includes(field.type) && (
                <input
                  type={field.type || 'text'}
                  placeholder={field.placeholder ?? ''}
                  {...form.register(field.name)}
                />
              )}

              {form.formState.errors[field.name] && (
                <small className="error-text">
                  {form.formState.errors[field.name]?.message}
                </small>
              )}
            </label>
          ))}

          <button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </section>
    </div>
  )
}
