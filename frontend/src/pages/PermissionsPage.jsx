import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../api/client'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório.'),
  key: z.string().min(1, 'Chave é obrigatória.'),
  module: z.string().min(1, 'Módulo é obrigatório.'),
})

const initialValues = {
  name: '',
  key: '',
  module: '',
}

export function PermissionsPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [selectedRoleExternalId, setSelectedRoleExternalId] = useState('')
  const [matrixDraft, setMatrixDraft] = useState({})

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })

  const permissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await api.get('/permissions')
      return data.data
    },
  })

  const rolesQuery = useQuery({
    queryKey: ['roles-permissions-page'],
    queryFn: async () => {
      const { data } = await api.get('/roles', { params: { per_page: 200 } })
      return data.data
    },
  })

  const effectiveRoleExternalId =
    selectedRoleExternalId || rolesQuery.data?.[0]?.external_id || ''

  const selectedRole = useMemo(
    () =>
      (rolesQuery.data ?? []).find(
        (role) => role.external_id === effectiveRoleExternalId,
      ),
    [effectiveRoleExternalId, rolesQuery.data],
  )

  const selectedPermissions = useMemo(() => {
    if (!effectiveRoleExternalId) {
      return []
    }

    if (matrixDraft[effectiveRoleExternalId]) {
      return matrixDraft[effectiveRoleExternalId]
    }

    return (selectedRole?.permissions ?? []).map((permission) => permission.external_id)
  }, [effectiveRoleExternalId, matrixDraft, selectedRole])

  const groupedPermissions = useMemo(() => {
    const groups = {}

    for (const permission of permissionsQuery.data ?? []) {
      if (!groups[permission.module]) {
        groups[permission.module] = []
      }
      groups[permission.module].push(permission)
    }

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [permissionsQuery.data])

  const savePermissionMutation = useMutation({
    mutationFn: async (values) => {
      if (editing) {
        await api.put(`/permissions/${editing.external_id}`, values)
      } else {
        await api.post('/permissions', values)
      }
    },
    onSuccess: async () => {
      setEditing(null)
      form.reset(initialValues)
      setStatusMessage('Permissão salva com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['permissions'] })
      await queryClient.invalidateQueries({ queryKey: ['roles-permissions-page'] })
    },
    onError: (error) => {
      const apiMessage = error?.response?.data?.message
      setStatusMessage(apiMessage || 'Não foi possível salvar a permissão.')
    },
  })

  const deletePermissionMutation = useMutation({
    mutationFn: async (externalId) => {
      await api.delete(`/permissions/${externalId}`)
    },
    onSuccess: async () => {
      setStatusMessage('Permissão removida com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['permissions'] })
      await queryClient.invalidateQueries({ queryKey: ['roles-permissions-page'] })
    },
    onError: () => {
      setStatusMessage('Não foi possível remover a permissão.')
    },
  })

  const saveMatrixMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveRoleExternalId) {
        return
      }

      await api.put(`/roles/${effectiveRoleExternalId}/permissions`, {
        permission_external_ids: selectedPermissions,
      })
    },
    onSuccess: async () => {
      setStatusMessage('Matriz de permissões atualizada com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['roles-permissions-page'] })
    },
    onError: (error) => {
      const validationMessage = error?.response?.data?.errors?.role?.[0]
      const apiMessage = error?.response?.data?.message
      setStatusMessage(
        validationMessage || apiMessage || 'Não foi possível atualizar a matriz.',
      )
    },
  })

  function onEdit(permission) {
    setEditing(permission)
    form.setValue('name', permission.name)
    form.setValue('key', permission.key)
    form.setValue('module', permission.module)
  }

  function onCancelEdit() {
    setEditing(null)
    form.reset(initialValues)
  }

  function togglePermission(externalId) {
    setMatrixDraft((current) => {
      const currentSelection =
        current[effectiveRoleExternalId] ?? selectedPermissions

      if (currentSelection.includes(externalId)) {
        return {
          ...current,
          [effectiveRoleExternalId]: currentSelection.filter((id) => id !== externalId),
        }
      }

      return {
        ...current,
        [effectiveRoleExternalId]: [...currentSelection, externalId],
      }
    })
  }

  function selectAllModule(modulePermissions) {
    const moduleIds = modulePermissions.map((permission) => permission.external_id)

    setMatrixDraft((current) => {
      const currentSelection =
        current[effectiveRoleExternalId] ?? selectedPermissions
      const next = new Set(currentSelection)
      const allSelected = moduleIds.every((id) => next.has(id))

      if (allSelected) {
        moduleIds.forEach((id) => next.delete(id))
      } else {
        moduleIds.forEach((id) => next.add(id))
      }

      return {
        ...current,
        [effectiveRoleExternalId]: Array.from(next),
      }
    })
  }

  return (
    <div className="module-stack">
      <div className="module-grid">
        <section className="module-card">
          <div className="section-title-row">
            <h3>Permissões</h3>
            <p>{permissionsQuery.data?.length ?? 0} itens</p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Chave</th>
                  <th>Módulo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(permissionsQuery.data ?? []).map((permission) => (
                  <tr key={permission.external_id}>
                    <td>{permission.name}</td>
                    <td>{permission.key}</td>
                    <td>{permission.module}</td>
                    <td className="actions-cell">
                      <button type="button" onClick={() => onEdit(permission)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() =>
                          deletePermissionMutation.mutate(permission.external_id)
                        }
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
            <h3>{editing ? 'Editar Permissão' : 'Nova Permissão'}</h3>
            {editing && (
              <button type="button" onClick={onCancelEdit}>
                Cancelar edição
              </button>
            )}
          </div>

          <form
            className="stack-form"
            onSubmit={form.handleSubmit((values) => savePermissionMutation.mutate(values))}
          >
            <label>
              <span>Nome *</span>
              <input type="text" {...form.register('name')} />
              {form.formState.errors.name && (
                <small className="error-text">{form.formState.errors.name.message}</small>
              )}
            </label>

            <label>
              <span>Chave *</span>
              <input type="text" placeholder="users.manage" {...form.register('key')} />
              {form.formState.errors.key && (
                <small className="error-text">{form.formState.errors.key.message}</small>
              )}
            </label>

            <label>
              <span>Módulo *</span>
              <input type="text" placeholder="users" {...form.register('module')} />
              {form.formState.errors.module && (
                <small className="error-text">{form.formState.errors.module.message}</small>
              )}
            </label>

            {statusMessage && <p className="status-text">{statusMessage}</p>}

            <button type="submit" disabled={savePermissionMutation.isPending}>
              {savePermissionMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </section>
      </div>

      <section className="module-card">
        <div className="section-title-row">
          <h3>Matriz Perfil x Permissão</h3>
          <p>Toggles por módulo</p>
        </div>

        <div className="matrix-toolbar">
          <label>
            <span>Perfil</span>
            <select
              value={effectiveRoleExternalId}
              onChange={(event) => setSelectedRoleExternalId(event.target.value)}
            >
              {(rolesQuery.data ?? []).map((role) => (
                <option key={role.external_id} value={role.external_id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          <button type="button" onClick={() => saveMatrixMutation.mutate()}>
            {saveMatrixMutation.isPending ? 'Salvando...' : 'Salvar permissões'}
          </button>
        </div>

        {selectedRole?.is_system && selectedRole?.name === 'Admin' && (
          <p className="status-text">Perfil Admin é protegido e não pode ser alterado.</p>
        )}

        <div className="matrix-grid">
          {groupedPermissions.map(([module, modulePermissions]) => (
            <article className="matrix-card" key={module}>
              <div className="matrix-card-header">
                <h4>{module}</h4>
                <button
                  type="button"
                  className="ghost-chip"
                  onClick={() => selectAllModule(modulePermissions)}
                >
                  Selecionar todos
                </button>
              </div>

              <div className="checkbox-stack">
                {modulePermissions.map((permission) => (
                  <label key={permission.external_id} className="checkbox-line">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.external_id)}
                      onChange={() => togglePermission(permission.external_id)}
                    />
                    <span>{permission.name}</span>
                    <code>{permission.key}</code>
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
