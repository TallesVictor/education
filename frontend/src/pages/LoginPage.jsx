import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const schema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
})

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'admin@escola.local',
      password: 'admin123',
    },
  })

  async function onSubmit(values) {
    try {
      await login(values.email, values.password)
      navigate('/dashboard')
    } catch {
      form.setError('root', { message: 'Credenciais inválidas.' })
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <p className="brand-overline">Sistema Escolar</p>
        <h1>Acesso ao Painel</h1>

        <form className="stack-form" onSubmit={form.handleSubmit(onSubmit)}>
          <label>
            <span>E-mail *</span>
            <input type="email" {...form.register('email')} />
            {form.formState.errors.email && (
              <small className="error-text">{form.formState.errors.email.message}</small>
            )}
          </label>

          <label>
            <span>Senha *</span>
            <input type="password" {...form.register('password')} />
            {form.formState.errors.password && (
              <small className="error-text">{form.formState.errors.password.message}</small>
            )}
          </label>

          {form.formState.errors.root && (
            <small className="error-text">{form.formState.errors.root.message}</small>
          )}

          <button type="submit">Entrar</button>
        </form>
      </div>
    </div>
  )
}
