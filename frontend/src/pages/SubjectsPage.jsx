import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../api/client'
import { PaginationControls } from '../components/PaginationControls'
import { AttributeSearchFilter } from '../components/AttributeSearchFilter'
import { useToast } from '../hooks/useToast'
import { Icon } from '../components/Icon'
import { MultiSelectField } from '../components/MultiSelectField'

const schema = z.object({
  school_external_ids: z.array(z.string()).optional(),
  name: z.string().min(1, 'Nome é obrigatório.'),
  description: z.string().optional(),
  class_external_ids: z.array(z.string()).optional(),
})

const initialValues = {
  school_external_ids: [],
  name: '',
  description: '',
  class_external_ids: [],
}

const subjectFilterDefinitions = [
  {
    key: 'name',
    label: 'Nome',
    aliases: ['nome', 'name'],
    type: 'text',
    theme: 'name',
    placeholder: 'Ex.: Matemática',
  },
  {
    key: 'description',
    label: 'Descrição',
    aliases: ['descricao', 'description'],
    type: 'text',
    theme: 'description',
    placeholder: 'Ex.: Básica',
  },
  {
    key: 'school_external_id',
    label: 'Escola',
    aliases: ['escola', 'school'],
    type: 'select',
    theme: 'school',
  },
  {
    key: 'class_external_id',
    label: 'Turma',
    aliases: ['turma', 'class'],
    type: 'select',
    theme: 'class',
    keepAttributeInInput: true,
  },
]

export function SubjectsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState(null)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [statusMessage, setStatusMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [activeFilters, setActiveFilters] = useState([])

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })
  const selectedSchoolExternalIds = useWatch({
    control: form.control,
    name: 'school_external_ids',
  })

  const schoolsQuery = useQuery({
    queryKey: ['schools-subject-form'],
    queryFn: async () => {
      const { data } = await api.get('/schools', { params: { per_page: 200 } })
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

  const classesQuery = useQuery({
    queryKey: ['classes-subject-form'],
    queryFn: async () => {
      const { data } = await api.get('/classes', { params: { per_page: 200 } })
      return data.data
    },
  })

  const allClassOptions = useMemo(
    () =>
      (classesQuery.data ?? []).map((schoolClass) => ({
        value: schoolClass.external_id,
        label: `${schoolClass.name} (${schoolClass.year})`,
      })),
    [classesQuery.data],
  )

  const classOptions = useMemo(() => {
    const availableClasses = classesQuery.data ?? []
    const selectedSchools = Array.isArray(selectedSchoolExternalIds) ? selectedSchoolExternalIds : []
    const selectedSchoolsSet = new Set(selectedSchools)
    const filteredClasses = selectedSchoolsSet.size > 0
      ? availableClasses.filter((schoolClass) => selectedSchoolsSet.has(schoolClass.school_external_id))
      : availableClasses

    return filteredClasses.map((schoolClass) => ({
      value: schoolClass.external_id,
      label: `${schoolClass.name} (${schoolClass.year})`,
    }))
  }, [classesQuery.data, selectedSchoolExternalIds])

  useEffect(() => {
    const currentSelectedClassIds = form.getValues('class_external_ids') ?? []

    if (!Array.isArray(currentSelectedClassIds) || currentSelectedClassIds.length === 0) {
      return
    }

    const availableClassIds = new Set(classOptions.map((option) => option.value))
    const sanitizedClassIds = currentSelectedClassIds.filter((classExternalId) =>
      availableClassIds.has(classExternalId),
    )

    if (sanitizedClassIds.length !== currentSelectedClassIds.length) {
      form.setValue('class_external_ids', sanitizedClassIds)
    }
  }, [classOptions, form])

  const subjectFilterOptions = useMemo(
    () =>
      subjectFilterDefinitions.map((filterDefinition) => {
        if (filterDefinition.key === 'school_external_id') {
          return {
            ...filterDefinition,
            options: schoolOptions,
            placeholder: 'Selecione uma escola',
          }
        }

        if (filterDefinition.key === 'class_external_id') {
          return {
            ...filterDefinition,
            options: allClassOptions,
            placeholder: 'Selecione uma ou mais turmas',
          }
        }

        return filterDefinition
      }),
    [allClassOptions, schoolOptions],
  )

  const activeFilterParams = useMemo(() => {
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
  }, [activeFilters])

  const subjectsQuery = useQuery({
    queryKey: ['subjects', page, activeFilters],
    queryFn: async () => {
      const { data } = await api.get('/subjects', {
        params: {
          page,
          per_page: 15,
          ...activeFilterParams,
        },
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
      formData.append('description', values.description || '')
      formData.append('sync_schools', '1')
      formData.append('sync_classes', '1')

      const schoolExternalIds = Array.isArray(values.school_external_ids)
        ? values.school_external_ids
        : values.school_external_ids
          ? [values.school_external_ids]
          : []

      for (const schoolExternalId of schoolExternalIds) {
        formData.append('school_external_ids[]', schoolExternalId)
      }

      const classExternalIds = Array.isArray(values.class_external_ids)
        ? values.class_external_ids
        : values.class_external_ids
          ? [values.class_external_ids]
          : []

      for (const classExternalId of classExternalIds) {
        formData.append('class_external_ids[]', classExternalId)
      }

      if (selectedImage) {
        formData.append('image', selectedImage)
      }

      if (editing) {
        formData.append('_method', 'PUT')
        await api.post(`/subjects/${editing.external_id}`, formData)
      } else {
        await api.post('/subjects', formData)
      }
    },
    onSuccess: async () => {
      setEditing(null)
      setIsFormModalOpen(false)
      setSelectedImage(null)
      setImagePreview('')
      form.reset(initialValues)
      setStatusMessage('Disciplina salva com sucesso.')
      toast.success('Disciplina salva com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
    onError: (error) => {
      const validationErrors = error?.response?.data?.errors
      const firstValidationMessage = validationErrors
        ? Object.values(validationErrors).flat().find((message) => typeof message === 'string')
        : null
      const message =
        firstValidationMessage || error?.response?.data?.message || 'Não foi possível salvar a disciplina.'
      setStatusMessage(message)
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (externalId) => {
      await api.delete(`/subjects/${externalId}`)
    },
    onSuccess: async () => {
      setStatusMessage('Disciplina removida com sucesso.')
      toast.success('Disciplina removida com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
    onError: () => {
      setStatusMessage('Não foi possível remover a disciplina.')
      toast.error('Não foi possível remover a disciplina.')
    },
  })

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

  function onEdit(subject) {
    setEditing(subject)
    setIsFormModalOpen(true)
    const subjectSchoolExternalIds = Array.isArray(subject.school_external_ids)
      ? subject.school_external_ids
      : Array.isArray(subject.schools) && subject.schools.length > 0
        ? subject.schools.map((school) => school.external_id)
        : subject.school_external_id
          ? [subject.school_external_id]
          : []

    form.setValue(
      'school_external_ids',
      subjectSchoolExternalIds,
    )
    form.setValue('name', subject.name || '')
    form.setValue('description', subject.description || '')
    form.setValue(
      'class_external_ids',
      (subject.classes ?? []).map((schoolClass) => schoolClass.external_id),
    )
    setSelectedImage(null)
    setImagePreview(subject.image_url || '')
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
          <h3>Disciplinas</h3>
          <p>{subjectsQuery.data?.meta?.total ?? 0} registros</p>
        </div>
        <div className="actions-row module-toolbar-actions">
          <button type="button" onClick={openCreateForm}>
            <Icon name="add" size={14} />
            Cadastrar disciplina
          </button>
        </div>

        <AttributeSearchFilter
          definitions={subjectFilterOptions}
          activeFilters={activeFilters}
          onChange={(nextFilters) => {
            setPage(1)
            setActiveFilters(nextFilters)
          }}
          placeholder="Filtrar... ex.: nome:matemática"
        />

        {subjectsQuery.isLoading && <p>Carregando...</p>}

        {!subjectsQuery.isLoading && (subjectsQuery.data?.data ?? []).length === 0 && (
          <div className="subjects-empty-state">
            <span className="kpi-icon">
              <Icon name="subject" size={16} />
            </span>
            <strong>Nenhuma disciplina encontrada</strong>
            <p>Ajuste os filtros ou cadastre uma nova disciplina para começar.</p>
          </div>
        )}

        <div className="subject-widget-grid">
          {(subjectsQuery.data?.data ?? []).map((subject) => {
            const classes = subject.classes ?? []
            const classCount = subject.classes_count ?? classes.length
            const visibleClasses = classes.slice(0, 3)
            const remainingClasses = Math.max(0, classes.length - visibleClasses.length)

            return (
              <article key={subject.external_id} className="subject-widget-card">
                <div className="subject-widget-media">
                  {subject.image_url ? (
                    <img src={subject.image_url} alt={subject.name} className="subject-widget-image" />
                  ) : (
                    <div className="subject-widget-image-fallback">
                      <Icon name="subject" size={22} />
                      <span>Sem imagem</span>
                    </div>
                  )}
                  <span className="subject-widget-count">
                    <Icon name="class" size={14} />
                    {classCount} turma{classCount === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="subject-widget-body">
                  <div className="subject-widget-head">
                    <h4>{subject.name}</h4>
                  </div>

                  <p className="subject-widget-description">
                    {subject.description || 'Sem descrição cadastrada.'}
                  </p>

                  <div className="subject-widget-classes">
                    {visibleClasses.map((schoolClass) => (
                      <span key={schoolClass.external_id} className="pill-badge">
                        {schoolClass.name}
                      </span>
                    ))}
                    {remainingClasses > 0 && <span className="pill-badge">+{remainingClasses} turmas</span>}
                    {classes.length === 0 && <span className="muted-inline">Sem turmas vinculadas</span>}
                  </div>

                  <div className="subject-widget-actions">
                    <button type="button" className="ghost-chip" onClick={() => onEdit(subject)}>
                      <Icon name="edit" size={14} />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteMutation.mutate(subject.external_id)}
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
          meta={subjectsQuery.data?.meta}
          onPageChange={(nextPage) => setPage(Math.max(1, nextPage))}
        />
      </section>

      {isFormModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={onCancelEdit}>
          <section
            className="module-card modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={editing ? 'Editar Disciplina' : 'Nova Disciplina'}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-title-row">
              <h3>{editing ? 'Editar Disciplina' : 'Nova Disciplina'}</h3>
              <button type="button" className="ghost-chip" onClick={onCancelEdit}>
                <Icon name="close" size={14} />
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
                <span>Escolas</span>
                <Controller
                  name="school_external_ids"
                  control={form.control}
                  render={({ field }) => (
                    <MultiSelectField
                      options={schoolOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Selecione uma ou mais escolas"
                      searchPlaceholder="Filtrar escolas..."
                    />
                  )}
                />
              </label>

              <label>
                <span>Turmas</span>
                <Controller
                  name="class_external_ids"
                  control={form.control}
                  render={({ field }) => (
                    <MultiSelectField
                      options={classOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Selecione uma ou mais turmas"
                      searchPlaceholder="Filtrar turmas..."
                    />
                  )}
                />
              </label>

              <label>
                <span>Imagem</span>
                <input type="file" accept="image/*" onChange={handleImageChange} />
              </label>

              {imagePreview && (
                <div className="image-preview-box">
                  <img src={imagePreview} alt="Preview da disciplina" className="image-preview" />
                </div>
              )}

              <label>
                <span>Descrição</span>
                <textarea rows={4} {...form.register('description')} />
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
