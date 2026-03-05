import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { PaginationControls } from '../components/PaginationControls'
import { Icon } from '../components/Icon'

const SCOPE_LABELS = {
  global: 'Global',
  school: 'Escola',
  class: 'Turma',
}

const emptyFilters = {
  search: '',
  scope: '',
  school_external_id: '',
  class_external_id: '',
  status: '',
  tag: '',
  author: '',
  date_from: '',
  date_to: '',
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString('pt-BR')
}

function buildTopicParams(filters, page) {
  const params = {
    page,
    per_page: 15,
  }

  if (filters.search) {
    params.search = filters.search
  }

  if (filters.scope) {
    params.scope = filters.scope
  }

  if (filters.school_external_id) {
    params.school_external_id = filters.school_external_id
  }

  if (filters.class_external_id) {
    params.class_external_id = filters.class_external_id
  }

  if (filters.status) {
    params.status = filters.status
  }

  if (filters.tag) {
    params.tag = filters.tag
  }

  if (filters.author) {
    params.author = filters.author
  }

  if (filters.date_from) {
    params.date_from = filters.date_from
  }

  if (filters.date_to) {
    params.date_to = filters.date_to
  }

  return params
}

function parseTags(input) {
  if (!input) {
    return []
  }

  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildDiscussionTree(items) {
  const map = new Map()

  for (const item of items) {
    map.set(item.external_id, {
      ...item,
      children: [],
    })
  }

  const roots = []

  for (const item of items) {
    const current = map.get(item.external_id)

    if (item.parent_external_id && map.has(item.parent_external_id)) {
      map.get(item.parent_external_id)?.children.push(current)
      continue
    }

    roots.push(current)
  }

  return roots
}

function makeInitialTopicForm(defaultSchoolExternalId = '') {
  return {
    scope: 'global',
    school_external_id: defaultSchoolExternalId,
    class_external_id: '',
    title: '',
    description: '',
    tags_input: '',
    expires_at: '',
    is_pinned: false,
    attachment_file: null,
    remove_attachment: false,
    existing_attachment_name: '',
    existing_attachment_url: '',
  }
}

export function ForumsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState(emptyFilters)
  const [draftFilters, setDraftFilters] = useState(emptyFilters)
  const [selectedTopicExternalId, setSelectedTopicExternalId] = useState(null)
  const [isTopicFormOpen, setIsTopicFormOpen] = useState(false)
  const [editingTopicExternalId, setEditingTopicExternalId] = useState(null)
  const [topicForm, setTopicForm] = useState(makeInitialTopicForm())
  const [discussionContent, setDiscussionContent] = useState('')
  const [replyToDiscussionExternalId, setReplyToDiscussionExternalId] = useState(null)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [editingDiscussionExternalId, setEditingDiscussionExternalId] = useState(null)
  const [editingDiscussionContent, setEditingDiscussionContent] = useState('')

  const normalizedRole = (user?.role_name || '').toLowerCase()
  const isStudent = normalizedRole === 'aluno'
  const isAdmin = normalizedRole === 'admin'
  const canManageTopics = !isStudent

  const forumContextQuery = useQuery({
    queryKey: ['forum-context'],
    queryFn: async () => {
      const { data } = await api.get('/forums/context')
      return data.data
    },
  })

  const schoolOptions = forumContextQuery.data?.schools ?? []
  const allClassOptions = forumContextQuery.data?.classes ?? []

  useEffect(() => {
    if (!canManageTopics || isAdmin || topicForm.school_external_id || schoolOptions.length === 0) {
      return
    }

    const firstSchoolExternalId = schoolOptions[0]?.external_id || ''
    if (!firstSchoolExternalId) {
      return
    }

    setTopicForm((current) => ({
      ...current,
      school_external_id: firstSchoolExternalId,
    }))
  }, [canManageTopics, isAdmin, schoolOptions, topicForm.school_external_id])

  const classOptionsForTopicForm = useMemo(() => {
    if (!topicForm.school_external_id) {
      return allClassOptions
    }

    return allClassOptions.filter((schoolClass) => schoolClass.school_external_id === topicForm.school_external_id)
  }, [allClassOptions, topicForm.school_external_id])

  const classOptionsForFilter = useMemo(() => {
    if (!draftFilters.school_external_id) {
      return allClassOptions
    }

    return allClassOptions.filter((schoolClass) => schoolClass.school_external_id === draftFilters.school_external_id)
  }, [allClassOptions, draftFilters.school_external_id])

  const topicsQuery = useQuery({
    queryKey: ['forum-topics', page, filters],
    queryFn: async () => {
      const { data } = await api.get('/forums/topics', {
        params: buildTopicParams(filters, page),
      })

      return {
        data: data.data ?? [],
        meta: data.meta,
      }
    },
  })

  const selectedTopic = useMemo(() => {
    return (topicsQuery.data?.data ?? []).find((topic) => topic.external_id === selectedTopicExternalId) ?? null
  }, [topicsQuery.data, selectedTopicExternalId])

  useEffect(() => {
    const topics = topicsQuery.data?.data ?? []

    if (topics.length === 0) {
      setSelectedTopicExternalId(null)
      return
    }

    if (!selectedTopicExternalId || !topics.some((topic) => topic.external_id === selectedTopicExternalId)) {
      setSelectedTopicExternalId(topics[0].external_id)
    }
  }, [topicsQuery.data, selectedTopicExternalId])

  const discussionsQuery = useQuery({
    queryKey: ['forum-discussions', selectedTopicExternalId],
    enabled: Boolean(selectedTopicExternalId),
    queryFn: async () => {
      const { data } = await api.get(`/forums/topics/${selectedTopicExternalId}/discussions`)
      return data.data ?? []
    },
  })

  const discussionTree = useMemo(() => buildDiscussionTree(discussionsQuery.data ?? []), [discussionsQuery.data])

  const saveTopicMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingTopicExternalId) {
        payload.append('_method', 'PUT')
        await api.post(`/forums/topics/${editingTopicExternalId}`, payload)
      } else {
        await api.post('/forums/topics', payload)
      }
    },
    onSuccess: async () => {
      toast.success('Tópico salvo com sucesso.')
      setIsTopicFormOpen(false)
      setEditingTopicExternalId(null)
      setReplyToDiscussionExternalId(null)
      setTopicForm(makeInitialTopicForm(topicForm.school_external_id))
      await queryClient.invalidateQueries({ queryKey: ['forum-topics'] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Não foi possível salvar o tópico.')
    },
  })

  const deleteTopicMutation = useMutation({
    mutationFn: async (externalId) => {
      await api.delete(`/forums/topics/${externalId}`)
    },
    onSuccess: async () => {
      toast.success('Tópico removido com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['forum-topics'] })
      await queryClient.invalidateQueries({ queryKey: ['forum-discussions'] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Não foi possível remover o tópico.')
    },
  })

  const createDiscussionMutation = useMutation({
    mutationFn: async (payload) => {
      await api.post(`/forums/topics/${selectedTopicExternalId}/discussions`, payload)
    },
    onSuccess: async () => {
      toast.success('Discussão publicada com sucesso.')
      setDiscussionContent('')
      setReplyToDiscussionExternalId(null)
      setIsComposerOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['forum-discussions', selectedTopicExternalId] })
      await queryClient.invalidateQueries({ queryKey: ['forum-topics'] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Não foi possível publicar a discussão.')
    },
  })

  const updateDiscussionMutation = useMutation({
    mutationFn: async ({ externalId, content }) => {
      await api.put(`/forums/discussions/${externalId}`, { content })
    },
    onSuccess: async () => {
      toast.success('Discussão atualizada com sucesso.')
      setEditingDiscussionExternalId(null)
      setEditingDiscussionContent('')
      await queryClient.invalidateQueries({ queryKey: ['forum-discussions', selectedTopicExternalId] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Não foi possível atualizar a discussão.')
    },
  })

  const deleteDiscussionMutation = useMutation({
    mutationFn: async (externalId) => {
      await api.delete(`/forums/discussions/${externalId}`)
    },
    onSuccess: async () => {
      toast.success('Discussão removida com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['forum-discussions', selectedTopicExternalId] })
      await queryClient.invalidateQueries({ queryKey: ['forum-topics'] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Não foi possível remover a discussão.')
    },
  })

  const toggleLikeMutation = useMutation({
    mutationFn: async (discussionExternalId) => {
      await api.post(`/forums/discussions/${discussionExternalId}/like`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['forum-discussions', selectedTopicExternalId] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Não foi possível registrar curtida.')
    },
  })

  function handleApplyFilters() {
    setPage(1)
    setFilters(draftFilters)
  }

  function handleClearFilters() {
    setPage(1)
    setDraftFilters(emptyFilters)
    setFilters(emptyFilters)
  }

  function openCreateTopic() {
    setEditingTopicExternalId(null)
    setTopicForm(makeInitialTopicForm(topicForm.school_external_id))
    setIsTopicFormOpen(true)
  }

  function openEditTopic(topic) {
    setEditingTopicExternalId(topic.external_id)
    setTopicForm({
      scope: topic.scope,
      school_external_id: topic.school_external_id || topicForm.school_external_id || '',
      class_external_id: topic.class_external_id || '',
      title: topic.title || '',
      description: topic.description || '',
      tags_input: (topic.tags ?? []).join(', '),
      expires_at: topic.expires_at ? new Date(topic.expires_at).toISOString().slice(0, 16) : '',
      is_pinned: Boolean(topic.is_pinned),
      attachment_file: null,
      remove_attachment: false,
      existing_attachment_name: topic.attachment_original_name || '',
      existing_attachment_url: topic.attachment_url || '',
    })
    setIsTopicFormOpen(true)
  }

  function buildTopicPayload() {
    const payload = new FormData()
    payload.append('scope', topicForm.scope)
    payload.append('title', topicForm.title.trim())
    payload.append('description', topicForm.description.trim())
    payload.append('expires_at', topicForm.expires_at || '')
    payload.append('is_pinned', topicForm.is_pinned ? '1' : '0')

    const tags = parseTags(topicForm.tags_input)
    tags.forEach((tag, index) => {
      payload.append(`tags[${index}]`, tag)
    })

    if (topicForm.scope === 'school' && topicForm.school_external_id) {
      payload.append('school_external_id', topicForm.school_external_id)
    }

    if (topicForm.scope === 'class' && topicForm.class_external_id) {
      payload.append('class_external_id', topicForm.class_external_id)
    }

    if (topicForm.scope === 'class' && topicForm.school_external_id) {
      payload.append('school_external_id', topicForm.school_external_id)
    }

    if (topicForm.remove_attachment) {
      payload.append('remove_attachment', '1')
    }

    if (topicForm.attachment_file) {
      payload.append('attachment', topicForm.attachment_file)
    }

    return payload
  }

  function handleSubmitTopic(event) {
    event.preventDefault()

    if (!topicForm.title.trim()) {
      toast.error('Informe o título do tópico.')
      return
    }

    if (topicForm.scope === 'school' && !topicForm.school_external_id) {
      toast.error('Selecione a escola do tópico.')
      return
    }

    if (topicForm.scope === 'class' && !topicForm.class_external_id) {
      toast.error('Selecione a turma do tópico.')
      return
    }

    saveTopicMutation.mutate(buildTopicPayload())
  }

  function handleCreateDiscussion(event) {
    event.preventDefault()

    if (!discussionContent.trim()) {
      toast.error('Escreva o conteúdo da discussão.')
      return
    }

    const payload = {
      content: discussionContent.trim(),
    }

    if (replyToDiscussionExternalId) {
      payload.parent_external_id = replyToDiscussionExternalId
    }

    createDiscussionMutation.mutate(payload)
  }

  function canManageDiscussion(discussion) {
    if (!user?.external_id) {
      return false
    }

    if (isAdmin) {
      return true
    }

    return discussion.author?.external_id === user.external_id
  }

  function renderDiscussionNodes(nodes) {
    return nodes.map((discussion) => (
      <div key={discussion.external_id} className={`forum-discussion depth-${discussion.depth}`}>
        <header className="forum-discussion-header">
          <p>
            <strong>{discussion.author?.name || 'Usuário'}</strong>
            <span>{formatDateTime(discussion.created_at)}</span>
          </p>
          <span className="forum-discussion-depth">Nível {discussion.depth}</span>
        </header>

        {editingDiscussionExternalId === discussion.external_id ? (
          <div className="forum-discussion-edit-shell">
            <textarea
              rows={4}
              value={editingDiscussionContent}
              onChange={(event) => setEditingDiscussionContent(event.target.value)}
            />
            <div className="actions-row">
              <button
                type="button"
                onClick={() =>
                  updateDiscussionMutation.mutate({
                    externalId: discussion.external_id,
                    content: editingDiscussionContent.trim(),
                  })
                }
                disabled={updateDiscussionMutation.isPending || !editingDiscussionContent.trim()}
              >
                <Icon name="save" size={14} />
                Salvar edição
              </button>
              <button
                type="button"
                className="ghost-chip"
                onClick={() => {
                  setEditingDiscussionExternalId(null)
                  setEditingDiscussionContent('')
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <p className="forum-discussion-content">{discussion.content}</p>
        )}

        <div className="forum-discussion-actions">
          <button
            type="button"
            className={discussion.liked_by_me ? 'ghost-chip ghost-chip-active' : 'ghost-chip'}
            onClick={() => toggleLikeMutation.mutate(discussion.external_id)}
            disabled={toggleLikeMutation.isPending}
          >
            <Icon name="heart" size={14} />
            {discussion.likes_count}
          </button>

          {discussion.depth < 3 ? (
            <button
              type="button"
              className="ghost-chip"
              onClick={() => {
                setReplyToDiscussionExternalId(discussion.external_id)
                setIsComposerOpen(true)
              }}
            >
              <Icon name="comment" size={14} />
              Responder
            </button>
          ) : null}

          {canManageDiscussion(discussion) ? (
            <>
              <button
                type="button"
                className="ghost-chip"
                onClick={() => {
                  setEditingDiscussionExternalId(discussion.external_id)
                  setEditingDiscussionContent(discussion.content || '')
                }}
              >
                <Icon name="edit" size={14} />
                Editar
              </button>
              <button
                type="button"
                className="ghost-chip danger"
                onClick={() => {
                  if (window.confirm('Deseja remover esta discussão?')) {
                    deleteDiscussionMutation.mutate(discussion.external_id)
                  }
                }}
              >
                <Icon name="delete" size={14} />
                Excluir
              </button>
            </>
          ) : null}
        </div>

        {discussion.children.length > 0 ? (
          <div className="forum-discussion-children">{renderDiscussionNodes(discussion.children)}</div>
        ) : null}
      </div>
    ))
  }

  return (
    <>
      <section className="hero-panel">
        <p>Comunicação acadêmica</p>
        <h3>Fórum de tópicos e discussões</h3>
        <span className="muted-inline">
          Tópicos podem ser Globais, por Escola ou por Turma. Discussões permitem até 3 níveis de resposta.
        </span>
      </section>

      <div className="module-grid forum-layout">
        <section className="module-card">
          <div className="section-title-row">
            <h3>Tópicos</h3>
            <p>{topicsQuery.data?.meta?.total ?? 0} registros</p>
          </div>

          <div className="forum-filter-grid">
            <label>
              <span>Busca</span>
              <input
                type="text"
                placeholder="Título do tópico"
                value={draftFilters.search}
                onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
              />
            </label>
            <label>
              <span>Escopo</span>
              <select
                value={draftFilters.scope}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    scope: event.target.value,
                  }))
                }
              >
                <option value="">Todos</option>
                <option value="global">Global</option>
                <option value="school">Escola</option>
                <option value="class">Turma</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select
                value={draftFilters.status}
                onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="">Todos</option>
                <option value="open">Abertos</option>
                <option value="expired">Expirados</option>
              </select>
            </label>
            <label>
              <span>Escola</span>
              <select
                value={draftFilters.school_external_id}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    school_external_id: event.target.value,
                    class_external_id: '',
                  }))
                }
              >
                <option value="">Todas</option>
                {schoolOptions.map((school) => (
                  <option key={school.external_id} value={school.external_id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Turma</span>
              <select
                value={draftFilters.class_external_id}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    class_external_id: event.target.value,
                  }))
                }
              >
                <option value="">Todas</option>
                {classOptionsForFilter.map((schoolClass) => (
                  <option key={schoolClass.external_id} value={schoolClass.external_id}>
                    {schoolClass.name} ({schoolClass.year})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Autor</span>
              <input
                type="text"
                placeholder="Nome do autor"
                value={draftFilters.author}
                onChange={(event) => setDraftFilters((current) => ({ ...current, author: event.target.value }))}
              />
            </label>
            <label>
              <span>Tag</span>
              <input
                type="text"
                placeholder="Ex: provas"
                value={draftFilters.tag}
                onChange={(event) => setDraftFilters((current) => ({ ...current, tag: event.target.value }))}
              />
            </label>
            <label>
              <span>Data inicial</span>
              <input
                type="date"
                value={draftFilters.date_from}
                onChange={(event) => setDraftFilters((current) => ({ ...current, date_from: event.target.value }))}
              />
            </label>
            <label>
              <span>Data final</span>
              <input
                type="date"
                value={draftFilters.date_to}
                onChange={(event) => setDraftFilters((current) => ({ ...current, date_to: event.target.value }))}
              />
            </label>
          </div>

          <div className="actions-row forum-list-actions">
            <button type="button" onClick={handleApplyFilters}>
              Aplicar filtros
            </button>
            <button type="button" className="ghost-chip" onClick={handleClearFilters}>
              Limpar filtros
            </button>
            {canManageTopics ? (
              <button type="button" onClick={openCreateTopic}>
                <Icon name="add" size={14} />
                Novo tópico
              </button>
            ) : null}
          </div>

          {canManageTopics && isTopicFormOpen ? (
            <form className="forum-topic-form" onSubmit={handleSubmitTopic}>
              <p className="form-group-title">{editingTopicExternalId ? 'Editar tópico' : 'Novo tópico'}</p>

              <label>
                <span>Escopo</span>
                <select
                  value={topicForm.scope}
                  onChange={(event) =>
                    setTopicForm((current) => ({
                      ...current,
                      scope: event.target.value,
                      class_external_id: event.target.value === 'class' ? current.class_external_id : '',
                    }))
                  }
                >
                  <option value="global">Global</option>
                  <option value="school">Escola</option>
                  <option value="class">Turma</option>
                </select>
              </label>

              {topicForm.scope !== 'global' ? (
                <label>
                  <span>Escola</span>
                  <select
                    value={topicForm.school_external_id}
                    onChange={(event) =>
                      setTopicForm((current) => ({
                        ...current,
                        school_external_id: event.target.value,
                        class_external_id: '',
                      }))
                    }
                    disabled={!isAdmin && schoolOptions.length <= 1}
                  >
                    <option value="">Selecione</option>
                    {schoolOptions.map((school) => (
                      <option key={school.external_id} value={school.external_id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {topicForm.scope === 'class' ? (
                <label>
                  <span>Turma</span>
                  <select
                    value={topicForm.class_external_id}
                    onChange={(event) =>
                      setTopicForm((current) => ({
                        ...current,
                        class_external_id: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {classOptionsForTopicForm.map((schoolClass) => (
                      <option key={schoolClass.external_id} value={schoolClass.external_id}>
                        {schoolClass.name} ({schoolClass.year})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label>
                <span>Título</span>
                <input
                  type="text"
                  value={topicForm.title}
                  onChange={(event) => setTopicForm((current) => ({ ...current, title: event.target.value }))}
                />
              </label>

              <label>
                <span>Descrição</span>
                <textarea
                  rows={4}
                  value={topicForm.description}
                  onChange={(event) =>
                    setTopicForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Tags (separadas por vírgula)</span>
                <input
                  type="text"
                  placeholder="provas, simulados"
                  value={topicForm.tags_input}
                  onChange={(event) => setTopicForm((current) => ({ ...current, tags_input: event.target.value }))}
                />
              </label>

              <label>
                <span>Anexo</span>
                <input
                  type="file"
                  onChange={(event) =>
                    setTopicForm((current) => ({
                      ...current,
                      attachment_file: event.target.files?.[0] || null,
                    }))
                  }
                />
              </label>

              {topicForm.existing_attachment_url ? (
                <div className="forum-attachment-row">
                  <a
                    href={topicForm.existing_attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="ghost-link"
                  >
                    <Icon name="download" size={14} />
                    {topicForm.existing_attachment_name || 'Abrir anexo atual'}
                  </a>
                  <label className="forum-checkbox-row">
                    <input
                      type="checkbox"
                      checked={topicForm.remove_attachment}
                      onChange={(event) =>
                        setTopicForm((current) => ({
                          ...current,
                          remove_attachment: event.target.checked,
                        }))
                      }
                    />
                    <span>Remover anexo atual</span>
                  </label>
                </div>
              ) : null}

              <label>
                <span>Expira em</span>
                <input
                  type="datetime-local"
                  value={topicForm.expires_at}
                  onChange={(event) =>
                    setTopicForm((current) => ({
                      ...current,
                      expires_at: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="forum-checkbox-row">
                <input
                  type="checkbox"
                  checked={topicForm.is_pinned}
                  onChange={(event) =>
                    setTopicForm((current) => ({
                      ...current,
                      is_pinned: event.target.checked,
                    }))
                  }
                />
                <span>Fixar tópico</span>
              </label>

              <div className="actions-row">
                <button type="submit" disabled={saveTopicMutation.isPending}>
                  <Icon name="save" size={14} />
                  {editingTopicExternalId ? 'Salvar alterações' : 'Criar tópico'}
                </button>
                <button
                  type="button"
                  className="ghost-chip"
                  onClick={() => {
                    setIsTopicFormOpen(false)
                    setEditingTopicExternalId(null)
                    setTopicForm(makeInitialTopicForm(topicForm.school_external_id))
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : null}

          <div className="forum-topic-list" role="list">
            {(topicsQuery.data?.data ?? []).map((topic) => (
              <article
                key={topic.external_id}
                className={`forum-topic-item ${selectedTopicExternalId === topic.external_id ? 'forum-topic-item-active' : ''}`}
                onClick={() => setSelectedTopicExternalId(topic.external_id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedTopicExternalId(topic.external_id)
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="forum-topic-main">
                  <header>
                    <h4>{topic.title}</h4>
                    <div className="forum-topic-badges">
                      <span className="pill-badge">{SCOPE_LABELS[topic.scope] || topic.scope}</span>
                      {topic.is_pinned ? <span className="pill-badge">Fixado</span> : null}
                      {topic.is_expired ? <span className="pill-badge warning">Expirado</span> : null}
                    </div>
                  </header>

                  <p>{topic.description || 'Sem descrição.'}</p>

                  <footer>
                    <span>{topic.created_by?.name || 'Usuário'}</span>
                    <span>{topic.discussion_count ?? 0} discussões</span>
                  </footer>
                </div>

                {canManageTopics ? (
                  <div className="forum-topic-actions" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="ghost-chip" onClick={() => openEditTopic(topic)}>
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      type="button"
                      className="ghost-chip danger"
                      onClick={() => {
                        if (window.confirm('Deseja remover este tópico?')) {
                          deleteTopicMutation.mutate(topic.external_id)
                        }
                      }}
                    >
                      <Icon name="delete" size={14} />
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <PaginationControls meta={topicsQuery.data?.meta} onPageChange={(nextPage) => setPage(nextPage)} />
        </section>

        <section className="module-card">
          {selectedTopic ? (
            <>
              <div className="section-title-row">
                <h3>{selectedTopic.title}</h3>
                <p>{selectedTopic.discussion_count ?? 0} discussões</p>
              </div>

              <div className="forum-topic-summary">
                <div className="forum-topic-badges">
                  <span className="pill-badge">{SCOPE_LABELS[selectedTopic.scope] || selectedTopic.scope}</span>
                  {selectedTopic.is_pinned ? <span className="pill-badge">Fixado</span> : null}
                </div>
                <p>{selectedTopic.description || 'Sem descrição para este tópico.'}</p>
                <div className="forum-topic-meta-grid">
                  <span>
                    <strong>Criado por:</strong> {selectedTopic.created_by?.name || '-'}
                  </span>
                  <span>
                    <strong>Criado em:</strong> {formatDateTime(selectedTopic.created_at)}
                  </span>
                  <span>
                    <strong>Expira em:</strong> {formatDateTime(selectedTopic.expires_at)}
                  </span>
                  <span>
                    <strong>Escopo:</strong> {SCOPE_LABELS[selectedTopic.scope] || selectedTopic.scope}
                  </span>
                </div>
                {selectedTopic.attachment_url ? (
                  <a href={selectedTopic.attachment_url} target="_blank" rel="noreferrer" className="ghost-link">
                    <Icon name="download" size={14} />
                    {selectedTopic.attachment_original_name || 'Abrir anexo'}
                  </a>
                ) : null}
                {(selectedTopic.tags ?? []).length > 0 ? (
                  <div className="forum-tags-row">
                    {(selectedTopic.tags ?? []).map((tag) => (
                      <span key={tag} className="pill-badge">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="forum-composer-header">
                <p className="form-group-title">Nova discussão</p>
                <button
                  type="button"
                  className="ghost-chip"
                  onClick={() => setIsComposerOpen((current) => !current)}
                >
                  {isComposerOpen ? 'Recolher' : 'Expandir'}
                </button>
              </div>

              {isComposerOpen ? (
                <form className="forum-discussion-composer" onSubmit={handleCreateDiscussion}>
                  {replyToDiscussionExternalId ? (
                    <div className="forum-reply-indicator">
                      <span>Respondendo à discussão {replyToDiscussionExternalId.slice(-6)}</span>
                      <button type="button" className="ghost-chip" onClick={() => setReplyToDiscussionExternalId(null)}>
                        Limpar
                      </button>
                    </div>
                  ) : null}
                  <textarea
                    rows={4}
                    placeholder="Escreva sua mensagem..."
                    value={discussionContent}
                    onChange={(event) => setDiscussionContent(event.target.value)}
                  />
                  <div className="actions-row">
                    <button type="submit" disabled={createDiscussionMutation.isPending || !discussionContent.trim()}>
                      <Icon name="send" size={14} />
                      Publicar
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="forum-discussion-list">
                {discussionTree.length > 0 ? (
                  renderDiscussionNodes(discussionTree)
                ) : (
                  <p className="muted-inline">Ainda não há discussões neste tópico.</p>
                )}
              </div>
            </>
          ) : (
            <p className="muted-inline">Selecione um tópico para visualizar as discussões.</p>
          )}
        </section>
      </div>
    </>
  )
}
