import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../api/client'
import { PaginationControls } from '../components/PaginationControls'
import { AttributeSearchFilter } from '../components/AttributeSearchFilter'
import { useToast } from '../hooks/useToast'
import { Icon } from '../components/Icon'

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
  const [activeFilters, setActiveFilters] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState('')

  const schoolFilterDefinitions = useMemo(
    () => [
      {
        key: 'name',
        label: 'Nome',
        aliases: ['nome', 'name'],
        type: 'text',
        theme: 'name',
      },
      {
        key: 'type',
        label: 'Tipo',
        aliases: ['tipo', 'type'],
        type: 'select',
        theme: 'school',
        options: [
          { value: 'public', label: 'Pública' },
          { value: 'private', label: 'Privada' },
        ],
      },
      {
        key: 'city',
        label: 'Cidade',
        aliases: ['cidade', 'city'],
        type: 'text',
        theme: 'description',
      },
    ],
    [],
  )

  const filterParams = useMemo(() => {
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

    return {
      name: filterParamsToSingleValue(params.filter_name),
      type: filterParamsToSingleValue(params.filter_type),
      city: filterParamsToSingleValue(params.filter_city),
    }
  }, [activeFilters])

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })

  const schoolsQuery = useQuery({
    queryKey: ['schools', page, activeFilters],
    queryFn: async () => {
      const { data } = await api.get('/schools', {
        params: { page, per_page: 15, ...filterParams },
      })
      return {
        data: data.data,
        meta: data.meta,
      }
    },
  })

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      const formData = new FormData()
      formData.append('name', values.name)
      formData.append('cnpj', values.cnpj || '')
      formData.append('type', values.type)
      formData.append('zip_code', values.zip_code || '')
      formData.append('street', values.street || '')
      formData.append('neighborhood', values.neighborhood || '')
      formData.append('city', values.city || '')
      formData.append('state', values.state || '')
      formData.append('number', values.number || '')
      formData.append('complement', values.complement || '')

      if (selectedImage) {
        formData.append('image', selectedImage)
      }

      if (editing) {
        formData.append('_method', 'PUT')
        await api.post(`/schools/${editing.external_id}`, formData)
      } else {
        await api.post('/schools', formData)
      }
    },
    onSuccess: async () => {
      setEditing(null)
      setIsFormModalOpen(false)
      setSelectedImage(null)
      setImagePreview('')
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

  function handleImageChange(event) {
    const file = event.target.files?.[0]
    setSelectedImage(file || null)

    if (!file) {
      setImagePreview(editing?.image_url || '')
      return
    }

    const blobUrl = URL.createObjectURL(file)
    setImagePreview(blobUrl)
  }

  function onEdit(school) {
    setEditing(school)
    setIsFormModalOpen(true)
    for (const key of Object.keys(initialValues)) {
      form.setValue(key, school[key] ?? initialValues[key])
    }
    setSelectedImage(null)
    setImagePreview(school.image_url || '')
  }

  function onCancelEdit() {
    setEditing(null)
    setIsFormModalOpen(false)
    setSelectedImage(null)
    setImagePreview('')
    form.reset(initialValues)
  }

  function openCreateForm() {
    setEditing(null)
    setSelectedImage(null)
    setImagePreview('')
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
            <Icon name="add" size={14} />
            Cadastrar escola
          </button>
        </div>

        <AttributeSearchFilter
          definitions={schoolFilterDefinitions}
          activeFilters={activeFilters}
          onChange={(nextFilters) => {
            setPage(1)
            setActiveFilters(nextFilters)
          }}
          placeholder="Filtrar escolas... ex.: nome:centro"
        />

        {schoolsQuery.isLoading && <p>Carregando...</p>}

        {!schoolsQuery.isLoading && (schoolsQuery.data?.data ?? []).length === 0 && (
          <div className="subjects-empty-state">
            <span className="kpi-icon">
              <Icon name="school" size={16} />
            </span>
            <strong>Nenhuma escola encontrada</strong>
            <p>Ajuste os filtros ou cadastre uma nova escola para começar.</p>
          </div>
        )}

        <div className="school-widget-grid">
          {(schoolsQuery.data?.data ?? []).map((school) => {
            const cityLine = school.city && school.state ? `${school.city} - ${school.state}` : school.city || school.state || 'Local não informado'
            const typeLabel = school.type === 'public' ? 'Pública' : 'Privada'

            return (
              <article key={school.external_id} className="school-widget-card">
                <div className="school-widget-media">
                  {school.image_url ? (
                    <img src={school.image_url} alt={school.name} className="school-widget-image" />
                  ) : (
                    <div className="school-widget-image-fallback">
                      <Icon name="school" size={24} />
                      <span>Sem imagem</span>
                    </div>
                  )}
                  <span className={`school-widget-type school-widget-type-${school.type}`}>{typeLabel}</span>
                </div>

                <div className="school-widget-body">
                  <h4>{school.name}</h4>
                  <p className="school-widget-city">{cityLine}</p>
                  <div className="school-widget-meta">
                    <span className="pill-badge">CNPJ: {school.cnpj || 'Não informado'}</span>
                  </div>

                  <div className="school-widget-actions">
                    <button type="button" className="ghost-chip" onClick={() => onEdit(school)}>
                      <Icon name="edit" size={14} />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteMutation.mutate(school.external_id)}
                    >
                      <Icon name="delete" size={14} />
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
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
                <Icon name="close" size={14} />
                Fechar
              </button>
            </div>

            <form
              className="stack-form"
              onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
            >
              <label className="form-span-8">
                <span>Nome *</span>
                <input type="text" {...form.register('name')} />
                {form.formState.errors.name && (
                  <small className="error-text">{form.formState.errors.name.message}</small>
                )}
              </label>

              <label className="form-span-4">
                <span>CNPJ</span>
                <input type="text" {...form.register('cnpj')} />
              </label>

              <label className="form-span-4">
                <span>Tipo *</span>
                <select {...form.register('type')}>
                  <option value="private">Privada</option>
                  <option value="public">Pública</option>
                </select>
              </label>

              <label className="form-span-8">
                <span>Imagem</span>
                <input type="file" accept="image/*" onChange={handleImageChange} />
              </label>

              {imagePreview && (
                <div className="image-preview-box">
                  <img src={imagePreview} alt="Preview da escola" className="image-preview" />
                </div>
              )}

              <label className="form-span-4">
                <span>CEP</span>
                <input type="text" {...form.register('zip_code')} onBlur={handleCepBlur} />
              </label>

              <label className="form-span-3">
                <span>Número</span>
                <input type="text" {...form.register('number')} />
              </label>

              <label className="form-span-5">
                <span>Complemento</span>
                <input type="text" {...form.register('complement')} />
              </label>

              <label className="form-span-8">
                <span>Rua</span>
                <input type="text" {...form.register('street')} />
              </label>

              <label className="form-span-4">
                <span>Bairro</span>
                <input type="text" {...form.register('neighborhood')} />
              </label>

              <label className="form-span-8">
                <span>Cidade</span>
                <input type="text" {...form.register('city')} />
              </label>

              <label className="form-span-4">
                <span>UF</span>
                <input type="text" maxLength={2} {...form.register('state')} />
              </label>

              {statusMessage && <p className="status-text">{statusMessage}</p>}

              <button type="submit" disabled={saveMutation.isPending}>
                <Icon name="save" size={14} />
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

function filterParamsToSingleValue(value) {
  if (Array.isArray(value)) {
    return value[value.length - 1] ?? ''
  }

  return value ?? ''
}
