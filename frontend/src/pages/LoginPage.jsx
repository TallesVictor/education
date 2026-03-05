import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { Icon } from '../components/Icon'

const schema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
})

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const toast = useToast()

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(values) {
    try {
      await login(values.email, values.password)
      toast.success('Login realizado com sucesso.')
      const redirectTo = location.state?.from?.pathname || '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch {
      toast.error('Credenciais inválidas.')
      form.setError('root', { message: 'Credenciais inválidas.' })
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-icon">
            <Icon name="school" size={18} />
          </span>

          <div>
            <p className="brand-overline">RSoft Education</p>
            <h1>Acesso ao Painel Escolar</h1>
          </div>
        </div>

        <p className="auth-lead">
          Plataforma moderna para centralizar a operação acadêmica de escola, professores e alunos.
        </p>

        <form className="stack-form" onSubmit={form.handleSubmit(onSubmit)}>
          <label>
            <span>E-mail *</span>
            <input type="email" placeholder="coordenacao@escola.com" {...form.register('email')} />
            {form.formState.errors.email && (
              <small className="error-text">{form.formState.errors.email.message}</small>
            )}
          </label>

          <label>
            <span>Senha *</span>
            <input type="password" placeholder="Digite sua senha" {...form.register('password')} />
            {form.formState.errors.password && (
              <small className="error-text">{form.formState.errors.password.message}</small>
            )}
          </label>

          {form.formState.errors.root && (
            <small className="error-text">{form.formState.errors.root.message}</small>
          )}

          <button type="submit">
            <Icon name="spark" size={15} />
            Entrar
          </button>
        </form>

        <div className="auth-footer">
          <span className="pill-badge">
            <Icon name="teacher" size={13} />
            Professores
          </span>
          <span className="pill-badge">
            <Icon name="student" size={13} />
            Alunos
          </span>
          <span className="pill-badge">
            <Icon name="shield" size={13} />
            Segurança
          </span>
        </div>
      </div>
    </div>
  )
}
