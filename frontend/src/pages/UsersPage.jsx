import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../api/client'
import { CrudModule } from '../components/CrudModule'
import { useToast } from '../hooks/useToast'
import { Icon } from '../components/Icon'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().optional(),
  social_name: z.string().optional(),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  role_external_id: z.string().min(1),
  school_external_id: z.string().optional(),
})

export function UsersPage() {
  const toast = useToast()
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importRoleExternalId, setImportRoleExternalId] = useState('')
  const [importSchoolExternalId, setImportSchoolExternalId] = useState('')
  const [previewData, setPreviewData] = useState(null)
  const [resultData, setResultData] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')

  const rolesQuery = useQuery({
    queryKey: ['roles-select'],
    queryFn: async () => {
      const { data } = await api.get('/roles', { params: { per_page: 200 } })
      return data.data
    },
  })

  const schoolsQuery = useQuery({
    queryKey: ['schools-select'],
    queryFn: async () => {
      const { data } = await api.get('/schools', { params: { per_page: 200 } })
      return data.data
    },
  })

  const roleOptions = useMemo(
    () =>
      (rolesQuery.data ?? []).map((role) => ({
        value: role.external_id,
        label: role.name,
      })),
    [rolesQuery.data],
  )

  const schoolOptions = useMemo(
    () =>
      (schoolsQuery.data ?? []).map((school) => ({
        value: school.external_id,
        label: school.name,
      })),
    [schoolsQuery.data],
  )

  const effectiveImportRoleExternalId =
    importRoleExternalId || roleOptions[0]?.value || ''

  function buildImportPayload(preview) {
    const formData = new FormData()
    formData.append('file', importFile)
    formData.append('role_external_id', effectiveImportRoleExternalId)

    if (importSchoolExternalId) {
      formData.append('school_external_id', importSchoolExternalId)
    }

    if (preview) {
      formData.append('preview', '1')
    }

    return formData
  }

  const previewMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/users/import', buildImportPayload(true))
      return data.data
    },
    onSuccess: (payload) => {
      setPreviewData(payload)
      setResultData(null)
      setStatusMessage('Prévia gerada. Revise os dados e confirme a importação.')
      toast.success('Prévia gerada com sucesso.')
    },
    onError: () => {
      setStatusMessage('Não foi possível gerar a prévia da importação.')
      toast.error('Não foi possível gerar a prévia.')
    },
  })

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/users/import', buildImportPayload(false))
      return data.data
    },
    onSuccess: (payload) => {
      setResultData(payload)
      setStatusMessage('Importação concluída com sucesso.')
      toast.success('Importação concluída com sucesso.')
    },
    onError: () => {
      setStatusMessage('Não foi possível concluir a importação.')
      toast.error('Não foi possível concluir a importação.')
    },
  })

  async function handleDownloadTemplate() {
    try {
      const response = await api.get('/users/template', { responseType: 'blob' })
      const blobUrl = window.URL.createObjectURL(response.data)
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = 'modelo-importacao-usuarios.csv'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      setStatusMessage('Não foi possível baixar o modelo de importação.')
      toast.error('Não foi possível baixar o modelo.')
    }
  }

  function handlePreview() {
    if (!importFile || !effectiveImportRoleExternalId) {
      setStatusMessage('Selecione arquivo e perfil para gerar a prévia.')
      toast.info('Selecione arquivo e perfil para gerar a prévia.')
      return
    }

    previewMutation.mutate()
  }

  function handleConfirmImport() {
    if (!importFile || !effectiveImportRoleExternalId) {
      setStatusMessage('Selecione arquivo e perfil para confirmar a importação.')
      toast.info('Selecione arquivo e perfil para confirmar a importação.')
      return
    }

    confirmMutation.mutate()
  }

  const progress = previewMutation.isPending
    ? 45
    : confirmMutation.isPending
      ? 80
      : resultData
        ? 100
        : previewData
          ? 60
          : 0

  return (
    <div className="module-stack">
      <CrudModule
        title="Usuário"
        endpoint="users"
        formVariant="modal"
        renderListActions={({ openCreateForm }) => (
          <>
            <button type="button" onClick={openCreateForm}>
              <Icon name="add" size={14} />
              Cadastrar usuário
            </button>
            <button type="button" className="ghost-chip" onClick={() => setIsImportModalOpen(true)}>
              <Icon name="upload" size={14} />
              Importar usuários
            </button>
          </>
        )}
        columns={[
          { key: 'display_name', label: 'Nome' },
          { key: 'email', label: 'E-mail' },
          { key: 'role_name', label: 'Perfil' },
          { key: 'cpf', label: 'CPF' },
        ]}
        defaultFilters={{
          name: '',
          email: '',
          role_external_id: '',
        }}
        filterFields={[
          { name: 'name', label: 'Filtro por nome', placeholder: 'Digite o nome' },
          { name: 'email', label: 'Filtro por e-mail', placeholder: 'Digite o e-mail' },
          {
            name: 'role_external_id',
            label: 'Filtro por perfil',
            type: 'select',
            options: roleOptions,
          },
        ]}
        schema={schema}
        initialValues={{
          name: '',
          email: '',
          password: '',
          social_name: '',
          cpf: '',
          phone: '',
          role_external_id: '',
          school_external_id: '',
        }}
        fields={[
          { name: 'name', label: 'Nome *' },
          { name: 'email', label: 'E-mail *', type: 'email' },
          { name: 'password', label: 'Senha', type: 'password' },
          { name: 'social_name', label: 'Nome Social' },
          { name: 'cpf', label: 'CPF' },
          { name: 'phone', label: 'Telefone' },
          {
            name: 'role_external_id',
            label: 'Perfil *',
            type: 'select',
            options: roleOptions,
          },
          {
            name: 'school_external_id',
            label: 'Escola',
            type: 'select',
            options: schoolOptions,
          },
        ]}
      />

      {isImportModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsImportModalOpen(false)}>
          <section
            className="module-card modal-card import-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Importação de usuários"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-title-row">
              <h3>Importação de Usuários</h3>
              <button type="button" className="ghost-chip" onClick={() => setIsImportModalOpen(false)}>
                <Icon name="close" size={14} />
                Fechar
              </button>
            </div>

            <p className="muted-inline">Preview + confirmação + relatório</p>

            <div className="inline-form two-col">
              <label>
                <span>Perfil *</span>
                <select
                  value={effectiveImportRoleExternalId}
                  onChange={(event) => setImportRoleExternalId(event.target.value)}
                >
                  <option value="">Selecione</option>
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Escola (opcional)</span>
                <select
                  value={importSchoolExternalId}
                  onChange={(event) => setImportSchoolExternalId(event.target.value)}
                >
                  <option value="">Selecione</option>
                  {schoolOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="span-2">
                <span>Arquivo (XLSX/CSV) *</span>
                <input
                  type="file"
                  accept=".xlsx,.csv,.txt"
                  onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div className="actions-row">
              <button type="button" onClick={handleDownloadTemplate}>
                <Icon name="download" size={14} />
                Baixar modelo
              </button>
              <button type="button" onClick={handlePreview}>
                <Icon name="upload" size={14} />
                {previewMutation.isPending ? 'Gerando prévia...' : 'Gerar prévia'}
              </button>
              <button type="button" onClick={handleConfirmImport}>
                <Icon name="save" size={14} />
                {confirmMutation.isPending ? 'Importando...' : 'Confirmar importação'}
              </button>
            </div>

            <div className="progress-wrap">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>

            {previewData && (
              <div className="module-card inner-card">
                <div className="section-title-row">
                  <h3>Prévia</h3>
                  <p>
                    {previewData.inserted} inserções | {previewData.updated} atualizações |{' '}
                    {previewData.errors_count} erros
                  </p>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Linha</th>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>CPF</th>
                        <th>Ação</th>
                        <th>Mensagem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewData.preview_rows ?? []).map((row) => (
                        <tr key={`${row.line}-${row.email || row.name}`}>
                          <td>{row.line}</td>
                          <td>{row.name || '-'}</td>
                          <td>{row.email || '-'}</td>
                          <td>{row.cpf || '-'}</td>
                          <td>{row.action}</td>
                          <td>{row.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {resultData && (
              <div className="status-panel">
                <p>
                  Importação concluída: {resultData.inserted} inseridos, {resultData.updated}{' '}
                  atualizados, {resultData.errors_count} erros.
                </p>
                {resultData.error_report_url && (
                  <a href={resultData.error_report_url} target="_blank" rel="noopener noreferrer">
                    Baixar relatório de erros (XLSX)
                  </a>
                )}
              </div>
            )}

            {statusMessage && <p className="status-text">{statusMessage}</p>}
          </section>
        </div>
      )}
    </div>
  )
}
