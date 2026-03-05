import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../api/client'
import { PaginationControls } from '../components/PaginationControls'
import { useToast } from '../hooks/useToast'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório.'),
  cnpj: z.string().optional(),
  type: z.enum(['public', 'private']),
  zip_code: z.string().optional(),
  street: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
})

const initialValues = {
  name: '',
  cnpj: '',
  type: 'private',
  zip_code: '',
  street: '',
  neighborhood: '',
  city: '',
  state: '',
  number: '',
  complement: '',
}

export function SchoolsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState(null)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [statusMessage, setStatusMessage] = useState('')

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })

  const schoolsQuery = useQuery({
    queryKey: ['schools', page],
    queryFn: async () => {
      const { data } = await api.get('/schools', { params: { page, per_page: 15 } })
      return {
        data: data.data,
        meta: data.meta,
      }
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      if (editing) {
        await api.put(`/schools/${editing.external_id}`, values)
      } else {
        await api.post('/schools', values)
      }
    },
    onSuccess: async () => {
      setEditing(null)
      setIsFormModalOpen(false)
      form.reset(initialValues)
      setStatusMessage('Escola salva com sucesso.')
      toast.success('Escola salva com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['schools'] })
    },
    onError: (error) => {
      const apiMessage = error?.response?.data?.message
      setStatusMessage(apiMessage || 'Não foi possível salvar a escola.')
      toast.error(apiMessage || 'Não foi possível salvar a escola.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (externalId) => {
      await api.delete(`/schools/${externalId}`)
    },
    onSuccess: async () => {
      setStatusMessage('Escola removida com sucesso.')
      toast.success('Escola removida com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['schools'] })
    },
    onError: () => {
      setStatusMessage('Não foi possível remover a escola.')
      toast.error('Não foi possível remover a escola.')
    },
  })

  async function handleCepBlur(event) {
    const cep = event.target.value.replace(/\D/g, '')

    if (cep.length !== 8) {
      return
    }

    try {
      const { data } = await api.get(`/cep/${cep}`)
      const payload = data.data

      form.setValue('street', payload.logradouro || '')
      form.setValue('neighborhood', payload.bairro || '')
      form.setValue('city', payload.localidade || '')
      form.setValue('state', payload.uf || '')
      setStatusMessage('Endereço preenchido via ViaCEP.')
      toast.info('Endereço preenchido via ViaCEP.')
    } catch {
      setStatusMessage('Não foi possível localizar o CEP informado.')
      toast.error('Não foi possível localizar o CEP informado.')
    }
  }

  function onEdit(school) {
    setEditing(school)
    setIsFormModalOpen(true)
    for (const key of Object.keys(initialValues)) {
      form.setValue(key, school[key] ?? initialValues[key])
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

  return (
    <div className="module-grid module-grid-single">
      <section className="module-card">
        <div className="section-title-row">
          <h3>Escolas</h3>
          <p>{schoolsQuery.data?.meta?.total ?? 0} registros</p>
        </div>
        <div className="actions-row module-toolbar-actions">
          <button type="button" onClick={openCreateForm}>
            Cadastrar escola
          </button>
        </div>

        {schoolsQuery.isLoading && <p>Carregando...</p>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Cidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(schoolsQuery.data?.data ?? []).map((school) => (
                <tr key={school.external_id}>
                  <td>{school.name}</td>
                  <td>{school.type === 'public' ? 'Pública' : 'Privada'}</td>
                  <td>{school.city || '-'}</td>
                  <td className="actions-cell">
                    <button type="button" onClick={() => onEdit(school)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteMutation.mutate(school.external_id)}
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
          meta={schoolsQuery.data?.meta}
          onPageChange={(nextPage) => setPage(Math.max(1, nextPage))}
        />
      </section>

      {isFormModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={onCancelEdit}>
          <section
            className="module-card modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={editing ? 'Editar Escola' : 'Nova Escola'}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-title-row">
              <h3>{editing ? 'Editar Escola' : 'Nova Escola'}</h3>
              <button type="button" className="ghost-chip" onClick={onCancelEdit}>
                Fechar
              </button>
            </div>

            <form
              className="stack-form"
              onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
            >
              <label>
                <span>Nome *</span>
                <input type="text" {...form.register('name')} />
                {form.formState.errors.name && (
                  <small className="error-text">{form.formState.errors.name.message}</small>
                )}
              </label>

              <label>
                <span>CNPJ</span>
                <input type="text" {...form.register('cnpj')} />
              </label>

              <label>
                <span>Tipo *</span>
                <select {...form.register('type')}>
                  <option value="private">Privada</option>
                  <option value="public">Pública</option>
                </select>
              </label>

              <label>
                <span>CEP</span>
                <input type="text" {...form.register('zip_code')} onBlur={handleCepBlur} />
              </label>

              <label>
                <span>Número</span>
                <input type="text" {...form.register('number')} />
              </label>

              <label>
                <span>Complemento</span>
                <input type="text" {...form.register('complement')} />
              </label>

              <label>
                <span>Rua</span>
                <input type="text" {...form.register('street')} />
              </label>

              <label>
                <span>Bairro</span>
                <input type="text" {...form.register('neighborhood')} />
              </label>

              <label>
                <span>Cidade</span>
                <input type="text" {...form.register('city')} />
              </label>

              <label>
                <span>UF</span>
                <input type="text" maxLength={2} {...form.register('state')} />
              </label>

              {statusMessage && <p className="status-text">{statusMessage}</p>}

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
