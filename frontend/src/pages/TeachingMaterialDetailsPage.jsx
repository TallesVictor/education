import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { Icon } from '../components/Icon'

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

export function TeachingMaterialDetailsPage() {
  const { external_id: externalId } = useParams()

  const materialDetailsQuery = useQuery({
    queryKey: ['material-details', externalId],
    enabled: Boolean(externalId),
    queryFn: async () => {
      const { data } = await api.get(`/materials/${externalId}`)
      return data.data
    },
  })

  const material = materialDetailsQuery.data

  return (
    <div className="module-stack">
      <section className="module-card">
        <div className="section-title-row">
          <h3>Detalhes do Material</h3>
          <Link to="/materials" className="ghost-link">
            Voltar para materiais
          </Link>
        </div>

        {materialDetailsQuery.isLoading && <p>Carregando material...</p>}
        {materialDetailsQuery.isError && <p>Não foi possível carregar o material didático.</p>}

        {!materialDetailsQuery.isLoading && !materialDetailsQuery.isError && material && (
          <>
            <h4 className="material-detail-title">{material.title}</h4>

            <div className="material-expanded-panel material-expanded-panel-page">
              <div className="material-expanded-grid">
                <p>
                  <strong>Anexo:</strong> {material.file_original_name}
                </p>
                <p>
                  <strong>Formato:</strong> {(material.file_extension || '-').toUpperCase()}
                </p>
                <p>
                  <strong>Tamanho:</strong> {formatFileSize(material.file_size)}
                </p>
                <p>
                  <strong>Turma:</strong> {material.class_name || '-'}
                </p>
                <p>
                  <strong>Publicação:</strong> {formatDateTime(material.published_at)}
                </p>
                <p>
                  <strong>Versão:</strong> {material.version || '-'}
                </p>
              </div>

              <p className="material-expanded-description">
                {material.description || 'Sem descrição disponível para este material.'}
              </p>

              <div className="material-subject-chip-row">
                {(material.subjects ?? []).length > 0
                  ? material.subjects.map((subject) => (
                    <span key={subject.external_id} className="pill-badge">
                      {subject.name}
                    </span>
                  ))
                  : <span className="muted-inline">Sem disciplina</span>}
              </div>

              {material.preview_url ? (
                <div className="material-preview-wrapper material-preview-wrapper-page">
                  {material.preview_kind === 'image' && (
                    <img
                      src={material.preview_url}
                      alt={material.title}
                      className="material-preview-image"
                    />
                  )}

                  {material.preview_kind === 'video' && (
                    <video src={material.preview_url} controls className="material-preview-video" />
                  )}

                  {!['image', 'video'].includes(material.preview_kind) && (
                    <iframe
                      src={material.preview_url}
                      title={`Pré-visualização de ${material.title}`}
                      className="material-preview-frame"
                    />
                  )}
                </div>
              ) : (
                <p className="muted-inline">Pré-visualização indisponível para este arquivo.</p>
              )}

              <div className="actions-row">
                <a href={material.file_url} target="_blank" rel="noreferrer" className="button-link">
                  <Icon name="download" size={14} />
                  Abrir arquivo
                </a>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
