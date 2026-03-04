import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

const initialValues = {
  school_external_id: '',
  name: '',
  description: '',
}

export function SubjectsPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState('')

  const form = useForm({
    defaultValues: initialValues,
  })

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data } = await api.get('/subjects', { params: { per_page: 200 } })
      return data.data
    },
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

      if (values.school_external_id) {
        formData.append('school_external_id', values.school_external_id)
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
      setSelectedImage(null)
      setImagePreview('')
      form.reset(initialValues)
      setStatusMessage('Disciplina salva com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
    onError: () => {
      setStatusMessage('Não foi possível salvar a disciplina.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (externalId) => {
      await api.delete(`/subjects/${externalId}`)
    },
    onSuccess: async () => {
      setStatusMessage('Disciplina removida com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
    onError: () => {
      setStatusMessage('Não foi possível remover a disciplina.')
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
    form.setValue('school_external_id', subject.school_external_id || '')
    form.setValue('name', subject.name || '')
    form.setValue('description', subject.description || '')
    setSelectedImage(null)
    setImagePreview(subject.image_url || '')
  }

  function onCancelEdit() {
    setEditing(null)
    setSelectedImage(null)
    setImagePreview('')
    form.reset(initialValues)
  }

  return (
    <div className="module-grid">
      <section className="module-card">
        <div className="section-title-row">
          <h3>Disciplinas</h3>
          <p>{subjectsQuery.data?.length ?? 0} registros</p>
        </div>

        {subjectsQuery.isLoading && <p>Carregando...</p>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Imagem</th>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(subjectsQuery.data ?? []).map((subject) => (
                <tr key={subject.external_id}>
                  <td>
                    {subject.image_url ? (
                      <img src={subject.image_url} alt={subject.name} className="thumb" />
                    ) : (
                      <span className="muted-inline">Sem imagem</span>
                    )}
                  </td>
                  <td>{subject.name}</td>
                  <td>{subject.description || '-'}</td>
                  <td className="actions-cell">
                    <button type="button" onClick={() => onEdit(subject)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteMutation.mutate(subject.external_id)}
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
          <h3>{editing ? 'Editar Disciplina' : 'Nova Disciplina'}</h3>
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
          <label>
            <span>Nome *</span>
            <input
              type="text"
              {...form.register('name', { required: 'Nome é obrigatório.' })}
            />
            {form.formState.errors.name && (
              <small className="error-text">{form.formState.errors.name.message}</small>
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
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </section>
    </div>
  )
}
