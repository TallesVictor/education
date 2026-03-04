# Sistema Web Escolar

MVP completo baseado no `PLANEJEMNT.MD` com:

- Backend: Laravel 12 (API REST, Sanctum, Multi-tenant por `school_id`)
- Frontend: React + Vite (SPA)
- Banco: MySQL 8
- Cache/Fila: Redis 7
- Infra: Docker Compose (`nginx`, `app`, `worker`, `frontend`, `mysql`, `redis`)

## Subir ambiente

```bash
docker compose up -d --build
```

## Preparar backend

```bash
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed
docker compose exec app php artisan storage:link
```

## Acesso

- URL: `http://localhost`
- Login inicial:
  - E-mail: `admin@escola.local`
  - Senha: `admin123`

## Endpoints principais

- Auth: `/api/auth/*`
- Usuários: `/api/users`
- Escolas: `/api/schools`
- Disciplinas: `/api/subjects`
- Turmas: `/api/classes`
- Perfis: `/api/roles`
- Permissões: `/api/permissions`
- Matrículas: `/api/enrollments`

## Notas

- Todas as rotas privadas usam `auth:sanctum`.
- Middleware `tenant` define contexto de escola.
- Middleware `permission` valida acesso por módulo.
- IDs públicos usados nas rotas: `external_id` (NanoID).
