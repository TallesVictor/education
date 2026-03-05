export function PaginationControls({ meta, onPageChange }) {
  if (!meta || (meta.last_page ?? 1) <= 1) {
    return null
  }

  const currentPage = meta.current_page ?? 1
  const lastPage = meta.last_page ?? 1

  return (
    <div className="pagination-row">
      <button type="button" className="ghost-chip" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
        Anterior
      </button>

      <span className="pagination-meta">
        Página {currentPage} de {lastPage} · {meta.total ?? 0} registros
      </span>

      <button
        type="button"
        className="ghost-chip"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= lastPage}
      >
        Próxima
      </button>
    </div>
  )
}
