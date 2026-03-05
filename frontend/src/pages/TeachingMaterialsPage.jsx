import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../api/client'
import { PaginationControls } from '../components/PaginationControls'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../hooks/useAuth'
import { Icon } from '../components/Icon'

const schema = z.object({
  school_external_id: z.string().optional(),
  title: z.string().min(1, 'Título é obrigatório.'),
  description: z.string().optional(),
  subject_external_ids: z.array(z.string()).optional(),
  class_external_id: z.string().optional(),
  published_at: z.string().optional(),
  version: z.string().optional(),
  is_visible_to_students: z.boolean().default(true),
})

const initialValues = {
  school_external_id: '',
  title: '',
  description: '',
  subject_external_ids: [],
  class_external_id: '',
  published_at: '',
  version: '',
  is_visible_to_students: true,
}

const extensionOptions = [
  { value: '', label: 'Todos os formatos' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'xlsx', label: 'XLSX' },
  { value: 'pptx', label: 'PPTX' },
  { value: 'csv', label: 'CSV' },
]

function formatFileSize(fileSize) {
  const bytes = Number(fileSize || 0)

  if (!bytes) {
    return '-'
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function toLocalDateTimeInput(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

export function TeachingMaterialsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const [editing, setEditing] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [previewMaterial, setPreviewMaterial] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    title: '',
    subject_external_id: '',
    class_external_id: '',
    extension: '',
    visibility: '',
  })

  const canManageMaterials = user?.role_name?.toLowerCase() !== 'aluno'

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })

  const schoolsQuery = useQuery({
    queryKey: ['schools-materials-form'],
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

  const subjectsQuery = useQuery({
    queryKey: ['subjects-materials-form'],
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

  const classesQuery = useQuery({
    queryKey: ['classes-materials-form'],
    queryFn: async () => {
      const { data } = await api.get('/classes', { params: { per_page: 200 } })
      return data.data
    },
  })

  const classOptions = useMemo(
    () =>
      (classesQuery.data ?? []).map((schoolClass) => ({
        value: schoolClass.external_id,
        label: `${schoolClass.name} (${schoolClass.year})`,
      })),
    [classesQuery.data],
  )

  const materialsQuery = useQuery({
    queryKey: ['materials', page, filters],
    queryFn: async () => {
      const params = {
        page,
        per_page: 15,
      }

      if (filters.title) {
        params.filter_title = filters.title
      }

      if (filters.subject_external_id) {
        params.filter_subject_external_id = filters.subject_external_id
      }

      if (filters.class_external_id) {
        params.filter_class_external_id = filters.class_external_id
      }

      if (filters.extension) {
        params.filter_file_extension = filters.extension
      }

      if (filters.visibility) {
        params.filter_is_visible_to_students = filters.visibility
      }

      const { data } = await api.get('/materials', { params })

      return {
        data: data.data,
        meta: data.meta,
      }
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      const formData = new FormData()
      const subjectExternalIds = Array.isArray(values.subject_external_ids)
        ? values.subject_external_ids
        : values.subject_external_ids
          ? [values.subject_external_ids]
          : []

      if (!editing && !selectedFile) {
        throw new Error('Selecione um arquivo para cadastrar o material.')
      }

      formData.append('title', values.title)
      formData.append('description', values.description || '')
      formData.append('is_visible_to_students', values.is_visible_to_students ? '1' : '0')

      if (values.school_external_id) {
        formData.append('school_external_id', values.school_external_id)
      }

      if (values.class_external_id) {
        formData.append('class_external_id', values.class_external_id)
      }

      if (values.published_at) {
        formData.append('published_at', values.published_at)
      }

      if (values.version) {
        formData.append('version', values.version)
      }

      for (const subjectExternalId of subjectExternalIds) {
        formData.append('subject_external_ids[]', subjectExternalId)
      }

      if (selectedFile) {
        formData.append('file', selectedFile)
      }

      if (editing) {
        formData.append('_method', 'PUT')
        await api.post(`/materials/${editing.external_id}`, formData)
      } else {
        await api.post('/materials', formData)
      }
    },
    onSuccess: async () => {
      setEditing(null)
      setSelectedFile(null)
      setIsFormModalOpen(false)
      form.reset(initialValues)
      setStatusMessage('Material didático salvo com sucesso.')
      toast.success('Material didático salvo com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['materials'] })
    },
    onError: (error) => {
      const apiMessage = error?.response?.data?.message
      setStatusMessage(apiMessage || error.message || 'Não foi possível salvar o material didático.')
      toast.error(apiMessage || error.message || 'Não foi possível salvar o material didático.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (externalId) => {
      await api.delete(`/materials/${externalId}`)
    },
    onSuccess: async () => {
      setStatusMessage('Material didático removido com sucesso.')
      toast.success('Material didático removido com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['materials'] })
    },
    onError: (error) => {
      const apiMessage = error?.response?.data?.message
      setStatusMessage(apiMessage || 'Não foi possível remover o material didático.')
      toast.error(apiMessage || 'Não foi possível remover o material didático.')
    },
  })

  function openCreateForm() {
    setEditing(null)
    setSelectedFile(null)
    form.reset(initialValues)
    setIsFormModalOpen(true)
  }

  function onEdit(material) {
    setEditing(material)
    setSelectedFile(null)
    form.setValue('school_external_id', material.school_external_id || '')
    form.setValue('title', material.title || '')
    form.setValue('description', material.description || '')
    form.setValue('subject_external_ids', (material.subjects ?? []).map((subject) => subject.external_id))
    form.setValue('class_external_id', material.class_external_id || '')
    form.setValue('published_at', toLocalDateTimeInput(material.published_at))
    form.setValue('version', material.version || '')
    form.setValue('is_visible_to_students', Boolean(material.is_visible_to_students))
    setIsFormModalOpen(true)
  }

  function onCancelEdit() {
    setEditing(null)
    setSelectedFile(null)
    form.reset(initialValues)
    setIsFormModalOpen(false)
  }

  function setFilterValue(name, value) {
    setPage(1)
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function clearFilters() {
    setPage(1)
    setFilters({
      title: '',
      subject_external_id: '',
      class_external_id: '',
      extension: '',
      visibility: '',
    })
  }

  return (
    <div className="module-grid module-grid-single">
      <section className="module-card">
        <div className="section-title-row">
          <h3>Materiais Didáticos</h3>
          <p>{materialsQuery.data?.meta?.total ?? 0} registros</p>
        </div>

        {canManageMaterials && (
          <div className="actions-row module-toolbar-actions">
            <button type="button" onClick={openCreateForm}>
              <Icon name="add" size={14} />
              Cadastrar material
            </button>
          </div>
        )}

        <div className="filters-row material-filters">
          <label>
            <span>Título</span>
            <input
              type="text"
              value={filters.title}
              placeholder="Ex.: Álgebra linear"
              onChange={(event) => setFilterValue('title', event.target.value)}
            />
          </label>

          <label>
            <span>Disciplina</span>
            <select
              value={filters.subject_external_id}
              onChange={(event) => setFilterValue('subject_external_id', event.target.value)}
            >
              <option value="">Todas</option>
              {subjectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Turma</span>
            <select
              value={filters.class_external_id}
              onChange={(event) => setFilterValue('class_external_id', event.target.value)}
            >
              <option value="">Todas</option>
              {classOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Formato</span>
            <select
              value={filters.extension}
              onChange={(event) => setFilterValue('extension', event.target.value)}
            >
              {extensionOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Visibilidade</span>
            <select
              value={filters.visibility}
              onChange={(event) => setFilterValue('visibility', event.target.value)}
            >
              <option value="">Todos</option>
              <option value="1">Visível para alunos</option>
              <option value="0">Somente equipe</option>
            </select>
          </label>

          <div className="actions-row">
            <button type="button" className="ghost-chip" onClick={clearFilters}>
              <Icon name="close" size={14} />
              Limpar filtros
            </button>
          </div>
        </div>

        {materialsQuery.isLoading && <p>Carregando materiais...</p>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Arquivo</th>
                <th>Disciplinas</th>
                <th>Turma</th>
                <th>Publicação</th>
                <th>Visibilidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(materialsQuery.data?.data ?? []).map((material) => (
                <tr key={material.external_id}>
                  <td>{material.title}</td>
                  <td>
                    <div className="material-file-meta">
                      <strong>{material.file_original_name}</strong>
                      <span>
                        {(material.file_extension || '-').toUpperCase()} . {formatFileSize(material.file_size)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="material-subject-chip-row">
                      {(material.subjects ?? []).length > 0
                        ? material.subjects.map((subject) => (
                          <span key={subject.external_id} className="pill-badge">
                            {subject.name}
                          </span>
                        ))
                        : <span className="muted-inline">Sem disciplina</span>}
                    </div>
                  </td>
                  <td>{material.class_name || '-'}</td>
                  <td>
                    {material.published_at
                      ? new Date(material.published_at).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td>
                    <span className={`material-visibility ${material.is_visible_to_students ? 'is-visible' : 'is-private'}`}>
                      {material.is_visible_to_students ? 'Aluno e equipe' : 'Somente equipe'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button type="button" onClick={() => setPreviewMaterial(material)}>
                      <Icon name="preview" size={14} />
                      Visualizar
                    </button>
                    <a href={material.file_url} target="_blank" rel="noreferrer" className="ghost-link button-link">
                      <Icon name="download" size={14} />
                      Baixar
                    </a>
                    {canManageMaterials && (
                      <>
                        <button type="button" onClick={() => onEdit(material)}>
                          <Icon name="edit" size={14} />
                          Editar
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => deleteMutation.mutate(material.external_id)}
                        >
                          <Icon name="delete" size={14} />
                          Excluir
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationControls
          meta={materialsQuery.data?.meta}
          onPageChange={(nextPage) => setPage(Math.max(1, nextPage))}
        />
      </section>

      {isFormModalOpen && canManageMaterials && (
        <div className="modal-backdrop" role="presentation" onClick={onCancelEdit}>
          <section
            className="module-card modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={editing ? 'Editar Material Didático' : 'Novo Material Didático'}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-title-row">
              <h3>{editing ? 'Editar Material Didático' : 'Novo Material Didático'}</h3>
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
                <span>Título *</span>
                <input type="text" {...form.register('title')} />
                {form.formState.errors.title && (
                  <small className="error-text">{form.formState.errors.title.message}</small>
                )}
              </label>

              <label>
                <span>Escola</span>
                <select {...form.register('school_external_id')}>
                  <option value="">Selecione</option>
                  {schoolOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Disciplinas (vínculo 1:N)</span>
                <select multiple {...form.register('subject_external_ids')}>
                  {subjectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Turma</span>
                <select {...form.register('class_external_id')}>
                  <option value="">Selecione</option>
                  {classOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Data de publicação</span>
                <input type="datetime-local" {...form.register('published_at')} />
              </label>

              <label>
                <span>Versão</span>
                <input type="text" placeholder="Ex.: v1.0" {...form.register('version')} />
              </label>

              <label className="material-checkbox-field">
                <input type="checkbox" {...form.register('is_visible_to_students')} />
                <span>Disponível para alunos</span>
              </label>

              <label>
                <span>{editing ? 'Novo arquivo (opcional)' : 'Arquivo *'}</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.odt,.ods,.odp,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
                {editing && (
                  <small className="muted-inline">
                    Atual: {editing.file_original_name}
                  </small>
                )}
              </label>

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

      {previewMaterial && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPreviewMaterial(null)}>
          <section
            className="module-card modal-card material-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Pré-visualizar material didático"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-title-row">
              <h3>{previewMaterial.title}</h3>
              <button type="button" className="ghost-chip" onClick={() => setPreviewMaterial(null)}>
                <Icon name="close" size={14} />
                Fechar
              </button>
            </div>

            {previewMaterial.preview_url ? (
              <div className="material-preview-wrapper">
                {previewMaterial.preview_kind === 'image' && (
                  <img
                    src={previewMaterial.preview_url}
                    alt={previewMaterial.title}
                    className="material-preview-image"
                  />
                )}

                {previewMaterial.preview_kind === 'video' && (
                  <video src={previewMaterial.preview_url} controls className="material-preview-video" />
                )}

                {!['image', 'video'].includes(previewMaterial.preview_kind) && (
                  <iframe
                    src={previewMaterial.preview_url}
                    title={`Pré-visualização de ${previewMaterial.title}`}
                    className="material-preview-frame"
                  />
                )}
              </div>
            ) : (
              <p className="muted-inline">
                Pré-visualização indisponível para este arquivo. Use o botão de download.
              </p>
            )}

            <div className="actions-row">
              <a href={previewMaterial.file_url} target="_blank" rel="noreferrer" className="button-link">
                <Icon name="download" size={14} />
                Abrir arquivo
              </a>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
