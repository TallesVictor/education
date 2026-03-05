import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { PaginationControls } from './PaginationControls'
import { useToast } from '../hooks/useToast'

const PAGE_SIZE = 15

export function CrudModule({
  title,
  endpoint,
  columns,
  fields,
  schema,
  initialValues,
  transformSubmit,
  filterFields = [],
  defaultFilters = {},
  fixedParams = {},
  formVariant = 'inline',
  renderListActions,
  onRowClick,
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState(null)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState(defaultFilters)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)

  const listQuery = useQuery({
    queryKey: [endpoint, page, filters, fixedParams],
    queryFn: async () => {
      const { data } = await api.get(`/${endpoint}`, {
        params: {
          ...fixedParams,
          ...filters,
          page,
          per_page: PAGE_SIZE,
        },
      })

      return {
        data: data.data ?? [],
        meta: data.meta ?? null,
      }
    },
  })

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })

  const totalRecords = useMemo(() => {
    if (listQuery.data?.meta?.total !== undefined) {
      return listQuery.data.meta.total
    }

    return listQuery.data?.data?.length ?? 0
  }, [listQuery.data])

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      const payload = transformSubmit ? transformSubmit(values, editing) : values

      if (editing) {
        await api.put(`/${endpoint}/${editing.external_id}`, payload)
      } else {
        await api.post(`/${endpoint}`, payload)
      }
    },
    onSuccess: async () => {
      setEditing(null)
      setIsFormModalOpen(false)
      form.reset(initialValues)
      toast.success(`${title} salvo com sucesso.`)
      await queryClient.invalidateQueries({ queryKey: [endpoint] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || `Não foi possível salvar ${title.toLowerCase()}.`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (externalId) => {
      await api.delete(`/${endpoint}/${externalId}`)
    },
    onSuccess: async () => {
      toast.success(`${title} removido com sucesso.`)
      await queryClient.invalidateQueries({ queryKey: [endpoint] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || `Não foi possível remover ${title.toLowerCase()}.`)
    },
  })

  function onEdit(item) {
    setEditing(item)
    setIsFormModalOpen(true)

    for (const field of fields) {
      const value = field.getValue ? field.getValue(item) : item[field.name]
      form.setValue(field.name, value ?? (field.type === 'multiselect' ? [] : ''))
    }
  }

  function onCancelEdit() {
    setEditing(null)
    setIsFormModalOpen(false)
    form.reset(initialValues)
  }

  function openCreateForm() {
    setEditing(null)
    form.reset(initialValues)
    setIsFormModalOpen(true)
  }

  const isModalVariant = formVariant === 'modal'
  const shouldRenderInlineForm = !isModalVariant
  const shouldRenderModalForm = isModalVariant && isFormModalOpen

  function setFilterValue(name, value) {
    setPage(1)
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function clearFilters() {
    setPage(1)
    setFilters(defaultFilters)
  }

  return (
    <div className={isModalVariant ? 'module-grid module-grid-single' : 'module-grid'}>
      <section className="module-card">
        <div className="section-title-row">
          <h3>{title}</h3>
          <p>{totalRecords} registros</p>
        </div>

        {renderListActions && (
          <div className="actions-row module-toolbar-actions">
            {renderListActions({ openCreateForm })}
          </div>
        )}

        {filterFields.length > 0 && (
          <div className="filters-row">
            {filterFields.map((field) => (
              <label key={field.name}>
                <span>{field.label}</span>

                {field.type === 'select' ? (
                  <select
                    value={filters[field.name] ?? ''}
                    onChange={(event) => setFilterValue(field.name, event.target.value)}
                  >
                    <option value="">Todos</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={filters[field.name] ?? ''}
                    placeholder={field.placeholder || ''}
                    onChange={(event) => setFilterValue(field.name, event.target.value)}
                  />
                )}
              </label>
            ))}

            <div className="actions-row">
              <button type="button" className="ghost-chip" onClick={clearFilters}>
                Limpar filtros
              </button>
            </div>
          </div>
        )}

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
              {(listQuery.data?.data ?? []).map((row) => (
                <tr
                  key={row.external_id}
                  className={onRowClick ? 'row-clickable' : ''}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render ? column.render(row) : row[column.key] ?? '-'}
                    </td>
                  ))}
                  <td className="actions-cell">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onEdit(row)
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={(event) => {
                        event.stopPropagation()
                        deleteMutation.mutate(row.external_id)
                      }}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationControls
          meta={listQuery.data?.meta}
          onPageChange={(nextPage) => setPage(Math.max(1, nextPage))}
        />
      </section>

      {shouldRenderInlineForm && (
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

                {field.type === 'multiselect' && (
                  <select multiple {...form.register(field.name)}>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

                {!['textarea', 'select', 'multiselect'].includes(field.type) && (
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
      )}

      {shouldRenderModalForm && (
        <div className="modal-backdrop" role="presentation" onClick={onCancelEdit}>
          <section
            className="module-card modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={editing ? `Editar ${title}` : `Novo ${title}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-title-row">
              <h3>{editing ? `Editar ${title}` : `Novo ${title}`}</h3>
              <button type="button" className="ghost-chip" onClick={onCancelEdit}>
                Fechar
              </button>
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

                  {field.type === 'multiselect' && (
                    <select multiple {...form.register(field.name)}>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {!['textarea', 'select', 'multiselect'].includes(field.type) && (
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
      )}
    </div>
  )
}
