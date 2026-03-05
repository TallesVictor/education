import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="screen-center">
      <div className="module-card">
        <h2>Página não encontrada</h2>
        <p>O recurso solicitado não existe ou foi movido.</p>
        <Link to="/dashboard">Voltar para o painel</Link>
      </div>
    </div>
  )
}
