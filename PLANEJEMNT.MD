Perfeito! Vou gerar o `.md` atualizado com toda a seção Docker incluída.Vou entregar o planejamento completo e atualizado com a seção Docker:

---

# 📚 Planejamento — Sistema Web Escolar
> Stack: Laravel 12 + React + MySQL + Redis | Multi-Tenant Single Database | Docker (Dev)

---

## 📌 Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack & Decisões Técnicas](#2-stack--decisões-técnicas)
3. [Arquitetura Docker](#3-arquitetura-docker)
4. [Estrutura de Arquivos Docker](#4-estrutura-de-arquivos-docker)
5. [Configurações Docker](#5-configurações-docker)
6. [Arquitetura Multi-Tenant](#6-arquitetura-multi-tenant)
7. [Modelagem do Banco de Dados](#7-modelagem-do-banco-de-dados)
8. [Módulos do Sistema](#8-módulos-do-sistema)
9. [Regras de Negócio](#9-regras-de-negócio)
10. [Permissões & Perfis](#10-permissões--perfis)
11. [Importação & Exportação](#11-importação--exportação)
12. [Cache com Redis](#12-cache-com-redis)
13. [Padrões de Desenvolvimento](#13-padrões-de-desenvolvimento)
14. [UI/UX — Diretrizes](#14-uiux--diretrizes)
15. [Seeders & Dados Iniciais](#15-seeders--dados-iniciais)
16. [Estrutura de Pastas](#16-estrutura-de-pastas)
17. [Rotas da API](#17-rotas-da-api)
18. [Comandos Úteis](#18-comandos-úteis)

---

## 1. Visão Geral

Sistema web escolar focado em **simplicidade e funcionalidade**, com suporte a múltiplas escolas (Multi-Tenant Single Database). Todo o ambiente de desenvolvimento roda em **Docker** com Docker Compose puro, sem dependências locais além do Docker Desktop.

---

## 2. Stack & Decisões Técnicas

| Camada | Tecnologia | Observação |
|---|---|---|
| Backend | Laravel 12 | API REST |
| Frontend | React + Vite | SPA |
| Banco de Dados | MySQL 8 | Single Database Multi-Tenant |
| Cache | Redis 7 | Permissões, listagens, configurações |
| Servidor Web | Nginx (Alpine) | Proxy reverso para Laravel e React |
| Autenticação | Laravel Sanctum | Tokens por sessão |
| Importação | Laravel Excel (Maatwebsite) | XLSX e CSV |
| ID Público | NanoID | `external_id` em todos os models |
| CEP | ViaCEP API | Auto-preenchimento de endereço |
| Multi-Tenancy | Global Scopes + Middleware | `school_id` como tenant identifier |
| Orquestração | Docker Compose puro | Apenas ambiente local/dev |
| Queue | Laravel Queue Worker | Container dedicado |

---

## 3. Arquitetura Docker

### Serviços

```
┌─────────────────────────────────────────────────┐
│                    Docker Network                │
│                  (escola_network)                │
│                                                  │
│  ┌──────────┐    ┌──────────┐  ┌─────────────┐  │
│  │  nginx   │───▶│   app    │  │   worker    │  │
│  │ :80      │    │ Laravel  │  │ Queue Worker│  │
│  │          │───▶│  :9000   │  │ (Laravel)   │  │
│  │          │    └────┬─────┘  └──────┬──────┘  │
│  └──────────┘         │               │         │
│                  ┌────┴───────────────┘          │
│                  ▼                               │
│  ┌──────────┐  ┌──────────┐                     │
│  │  mysql   │  │  redis   │                     │
│  │  :3306   │  │  :6379   │                     │
│  └──────────┘  └──────────┘                     │
└─────────────────────────────────────────────────┘
```

### Serviços e Responsabilidades

| Serviço | Imagem | Porta | Responsabilidade |
|---|---|---|---|
| `nginx` | nginx:alpine | `80` | Proxy reverso — roteia `/api` para Laravel e `/` para React |
| `app` | php:8.3-fpm (custom) | `9000` (interno) | Laravel 12 (API) |
| `worker` | mesmo Dockerfile do `app` | — | Laravel Queue Worker |
| `mysql` | mysql:8.0 | `3306` | Banco de dados principal |
| `redis` | redis:7-alpine | `6379` | Cache e filas |
| `frontend` | node:20-alpine (dev) | `5173` (interno) | React + Vite (dev server) |

---

## 4. Estrutura de Arquivos Docker

```
projeto/
├── docker/
│   ├── nginx/
│   │   └── default.conf          # Configuração do Nginx
│   ├── php/
│   │   ├── Dockerfile            # Imagem customizada PHP 8.3-FPM
│   │   └── php.ini               # Configurações PHP
│   └── mysql/
│       └── my.cnf                # Configurações MySQL
├── backend/                      # Projeto Laravel 12
├── frontend/                     # Projeto React + Vite
├── docker-compose.yml
└── .env.docker                   # Variáveis de ambiente Docker
```

---

## 5. Configurações Docker

### `docker-compose.yml`

```yaml
version: '3.8'

services:

  nginx:
    image: nginx:alpine
    container_name: escola_nginx
    ports:
      - "80:80"
    volumes:
      - ./backend:/var/www/backend
      - ./frontend:/var/www/frontend
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - app
      - frontend
    networks:
      - escola_network

  app:
    build:
      context: ./docker/php
      dockerfile: Dockerfile
    container_name: escola_app
    working_dir: /var/www/backend
    volumes:
      - ./backend:/var/www/backend
      - ./docker/php/php.ini:/usr/local/etc/php/conf.d/custom.ini
    depends_on:
      - mysql
      - redis
    networks:
      - escola_network
    environment:
      - APP_ENV=local
      - APP_DEBUG=true

  worker:
    build:
      context: ./docker/php
      dockerfile: Dockerfile
    container_name: escola_worker
    working_dir: /var/www/backend
    volumes:
      - ./backend:/var/www/backend
    depends_on:
      - mysql
      - redis
    networks:
      - escola_network
    command: php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
    restart: unless-stopped

  frontend:
    image: node:20-alpine
    container_name: escola_frontend
    working_dir: /var/www/frontend
    volumes:
      - ./frontend:/var/www/frontend
    networks:
      - escola_network
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0"

  mysql:
    image: mysql:8.0
    container_name: escola_mysql
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: escola_db
      MYSQL_USER: escola_user
      MYSQL_PASSWORD: escola_pass
    volumes:
      - mysql_data:/var/lib/mysql
      - ./docker/mysql/my.cnf:/etc/mysql/conf.d/my.cnf
    networks:
      - escola_network

  redis:
    image: redis:7-alpine
    container_name: escola_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - escola_network
    command: redis-server --appendonly yes

networks:
  escola_network:
    driver: bridge

volumes:
  mysql_data:
  redis_data:
```

---

### `docker/php/Dockerfile`

```dockerfile
FROM php:8.3-fpm

# Dependências do sistema
RUN apt-get update && apt-get install -y \
    git curl libpng-dev libonig-dev \
    libxml2-dev zip unzip libzip-dev \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/backend

COPY . .

RUN composer install --no-interaction --prefer-dist --optimize-autoloader

RUN chown -R www-data:www-data /var/www/backend/storage \
    && chown -R www-data:www-data /var/www/backend/bootstrap/cache

EXPOSE 9000
CMD ["php-fpm"]
```

---

### `docker/nginx/default.conf`

```nginx
server {
    listen 80;
    server_name localhost;

    # Frontend (React Vite Dev Server)
    location / {
        proxy_pass http://frontend:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend (Laravel API)
    location /api {
        root /var/www/backend/public;
        index index.php;
        try_files $uri $uri/ /index.php?$query_string;

        location ~ \.php$ {
            fastcgi_pass app:9000;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
            include fastcgi_params;
        }
    }

    # Arquivos estáticos do Laravel (storage)
    location /storage {
        alias /var/www/backend/public/storage;
        try_files $uri $uri/ =404;
    }
}
```

---

### `docker/php/php.ini`

```ini
upload_max_filesize = 20M
post_max_size = 25M
memory_limit = 256M
max_execution_time = 120
```

---

### `docker/mysql/my.cnf`

```ini
[mysqld]
character-set-server = utf8mb4
collation-server     = utf8mb4_unicode_ci
default-time-zone    = '-03:00'
```

---

### `.env` do Laravel (backend/.env)

```env
APP_NAME="Sistema Escolar"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=escola_db
DB_USERNAME=escola_user
DB_PASSWORD=escola_pass

REDIS_HOST=redis
REDIS_PORT=6379

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

SANCTUM_STATEFUL_DOMAINS=localhost
```

---

## 6. Arquitetura Multi-Tenant

### Estratégia: Single Database com `school_id`

Todos os models pertencentes a uma escola possuem `school_id`. O contexto do tenant é definido automaticamente via middleware após autenticação.

```
Request
  → Middleware Auth (Sanctum)
  → Middleware SetTenantContext  →  app('tenant') = school_id
  → Global Scope BelongsToTenant →  WHERE school_id = {id}
  → Controller
```

**Regras:**
- Admin global não está vinculado a escola — visualiza tudo
- Demais usuários são fixos em uma única escola
- Cache isolado por escola: `school_{id}:recurso`
- Trait `BelongsToTenant` aplicado em todos os models com `school_id`

---

## 7. Modelagem do Banco de Dados

> **Todos os models possuem:** `id`, `external_id` (NanoID 21 chars, único), `deleted_at` (SoftDelete), `created_at`, `updated_at`

### `schools`
```sql
id, external_id, name NOT NULL, cnpj UNIQUE,
type ENUM('public','private') NOT NULL,
zip_code, street, neighborhood, city, state CHAR(2),
number, complement, deleted_at, timestamps
```

### `users`
```sql
id, external_id, school_id FK,
name NOT NULL, social_name, email UNIQUE NOT NULL,
password, cpf UNIQUE, phone,
deleted_at, timestamps
```
> `social_name` é exibido no lugar de `name` em saudações e identificação.

### `roles`
```sql
id, external_id, name NOT NULL, is_system BOOL DEFAULT 0,
deleted_at, timestamps
```

### `permissions`
```sql
id, external_id, name NOT NULL, module NOT NULL,
deleted_at, timestamps
```

### `role_permissions`
```sql
role_id FK, permission_id FK
PRIMARY KEY (role_id, permission_id)
```

### `user_school_roles`
```sql
id, user_id FK, school_id FK, role_id FK,
deleted_at, timestamps
UNIQUE (user_id, school_id)
```

### `subjects`
```sql
id, external_id, school_id FK,
name NOT NULL, description, image_path,
deleted_at, timestamps
```

### `classes`
```sql
id, external_id, school_id FK,
name NOT NULL, year NOT NULL,
deleted_at, timestamps
```

### `class_subjects`
```sql
id, class_id FK, subject_id FK,
deleted_at, timestamps
UNIQUE (class_id, subject_id)
```

### `enrollments`
```sql
id, external_id,
user_id FK, class_id FK, subject_id FK,
start_date (nullable), end_date (nullable),
deleted_at, timestamps
UNIQUE (user_id, class_id, subject_id)
```

---

## 8. Módulos do Sistema

### 🔐 Autenticação
- Login / Logout (Sanctum)
- Recuperação de senha por e-mail (job na fila)
- Middleware `SetTenantContext` injeta `school_id`
- Middleware `CheckPermission` valida acesso por módulo
- Admin bypassa toda verificação de permissão

### 👤 Usuários
Campos em ordem no formulário: Nome ✅, E-mail ✅, Senha, Nome Social, CPF, Telefone
- CRUD + filtro por nome, e-mail, perfil
- `social_name ?? name` em toda tela de identificação
- Importação XLSX/CSV com preview + relatório de erros
- Download de planilha modelo
- `email` ou `cpf` existente → **atualiza**

### 🏫 Escolas
Campos: Nome ✅, CNPJ ✅, Tipo ✅, CEP → auto-fill via ViaCEP, Número, Complemento
- CRUD + filtro por nome, tipo, cidade

### 📖 Disciplinas
Campos: Nome ✅, Escola (tenant automático) ✅, Imagem, Descrição
- CRUD + upload de imagem com preview

### 🏷️ Perfis
- CRUD — perfis `is_system` não editáveis/deletáveis
- Gerenciar permissões via toggles por módulo

### 🔑 Permissões
- CRUD + tela de vínculo perfil × permissão com checkboxes agrupados por módulo

### 🏫 Turmas
- CRUD + vincular disciplinas
- Filtro por nome e ano
- Contador de alunos e disciplinas na listagem

### 🔗 Matrículas
- Vínculo individual: aluno + turma + disciplina + datas opcionais
- **Em lote:** selecionar turma + disciplina → buscar alunos por nome/e-mail → checkbox + selecionar todos → confirmar
- Desvínculo via SoftDelete (histórico preservado)

---

## 9. Regras de Negócio

| # | Regra |
|---|---|
| RN01 | Usuário fixo em uma única escola (`school_id` imutável) |
| RN02 | `social_name` substitui `name` em saudações e identificação |
| RN03 | Importação: `email` ou `cpf` existente → atualiza |
| RN04 | Perfis `is_system = true` não podem ser editados ou deletados |
| RN05 | Perfil Admin ignora totalmente a tabela de permissões |
| RN06 | Um usuário pode ter perfis diferentes em escolas distintas |
| RN07 | Disciplina e Turma sempre pertencem a uma escola |
| RN08 | Vínculo aluno: `user → class → subject` |
| RN09 | SoftDelete em `enrollments` preserva histórico |
| RN10 | `external_id` (NanoID) é o identificador público em todas as rotas |
| RN11 | CEP dispara auto-complete de endereço via ViaCEP |
| RN12 | Campos obrigatórios sempre no topo do formulário |
| RN13 | E-mails (recuperação de senha, etc.) processados via Queue Worker |

---

## 10. Permissões & Perfis

### Lógica de Acesso
```
1. Login → identifica perfil em user_school_roles
2. Se perfil = Admin → acesso total (bypass completo)
3. Caso contrário → verifica role_permissions para o módulo
4. Sem permissão → 403 Forbidden
```

### Matriz Padrão (Seeder)

| Módulo | Admin | Diretor | Coordenador | Professor | Aluno |
|---|:---:|:---:|:---:|:---:|:---:|
| Gerenciar Usuários | ✅ | ✅ | — | — | — |
| Gerenciar Escolas | ✅ | — | — | — | — |
| Gerenciar Disciplinas | ✅ | ✅ | ✅ | — | — |
| Gerenciar Turmas | ✅ | ✅ | ✅ | — | — |
| Gerenciar Perfis | ✅ | — | — | — | — |
| Gerenciar Permissões | ✅ | — | — | — | — |
| Gerenciar Vínculos | ✅ | ✅ | ✅ | — | — |

---

## 11. Importação & Exportação

### Planilha Modelo

| nome | email | senha | nome_social | cpf | telefone |
|---|---|---|---|---|---|
| João Silva | joao@email.com | senha123 | Joãozinho | 123.456.789-00 | (11) 99999-9999 |

### Fluxo
```
1. Download da planilha modelo
2. Upload (XLSX ou CSV)
3. Preview dos dados parseados no frontend
4. Usuário confirma
5. Sistema processa linha a linha:
   email/cpf não existe → INSERT
   email/cpf existente  → UPDATE
   linha inválida       → registra no relatório
6. Exibe: X inseridos | Y atualizados | Z erros
7. Download do relatório de erros em XLSX
```

---

## 12. Cache com Redis

| Chave | TTL | Invalidar quando |
|---|---|---|
| `school_{id}:permissions:{role_id}` | 60 min | Editar `role_permissions` |
| `school_{id}:roles` | 30 min | CRUD de perfis |
| `school_{id}:subjects` | 15 min | CRUD de disciplinas |
| `school_{id}:classes` | 15 min | CRUD de turmas |
| `school_{id}:settings` | 60 min | Editar escola |

---

## 13. Padrões de Desenvolvimento

### Backend (Laravel 12)
- Rotas sempre usam `external_id` — nunca o `id` interno
- **Form Requests** para todas as validações
- **API Resources** para serialização das respostas
- **SoftDeletes** em todos os models
- **Trait `HasExternalId`** → gera NanoID no evento `creating`
- **Trait `BelongsToTenant`** → Global Scope por `school_id`
- Resposta padrão: `{ data, meta? }` | erro: `{ message, errors? }`
- Jobs de e-mail processados pela fila Redis via Worker

### Frontend (React + Vite)
- **TanStack Query** para cache e estado servidor
- **React Hook Form + Zod** para formulários e validação
- **Axios** com interceptors de auth token
- **React Router v6** para navegação SPA
- **Tailwind CSS** para estilização
- `social_name ?? name` em todos os componentes de identificação

---

## 14. UI/UX — Diretrizes

- Campos obrigatórios sempre no topo, marcados com `*`
- Auto-complete de CEP no `onBlur` do campo
- Preview de imagem antes de salvar (disciplinas)
- Wizard/steps para formulários longos (ex: cadastro de escola)
- Paginação em todas as listagens
- Filtros por nome/e-mail sempre disponíveis
- Barra de progresso durante importação
- Saudação: `"Olá, {social_name ?? name}"`
- Sidebar com módulos agrupados por seção
- Indicação visual de registros `is_system` (badge/ícone)
- Toasts de feedback em todas as ações (sucesso/erro)

---

## 15. Seeders & Dados Iniciais

### `RoleSeeder`
```
Admin, Diretor, Coordenador, Professor, Aluno
(todos com is_system: true)
```

### `PermissionSeeder`
```
Gerenciar Usuários    → module: users
Gerenciar Escolas     → module: schools
Gerenciar Disciplinas → module: subjects
Gerenciar Turmas      → module: classes
Gerenciar Perfis      → module: roles
Gerenciar Permissões  → module: permissions
Gerenciar Vínculos    → module: enrollments
```

### `RolePermissionSeeder`
Vincula permissões padrão a cada perfil conforme a matriz da seção 10.

### `AdminUserSeeder`
Cria o usuário Admin padrão para o primeiro acesso.

---

## 16. Estrutura de Pastas

```
projeto/
├── docker/
│   ├── nginx/
│   │   └── default.conf
│   ├── php/
│   │   ├── Dockerfile
│   │   └── php.ini
│   └── mysql/
│       └── my.cnf
├── backend/                          ← Laravel 12
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   ├── Middleware/
│   │   │   │   ├── SetTenantContext.php
│   │   │   │   └── CheckPermission.php
│   │   │   ├── Requests/
│   │   │   └── Resources/
│   │   ├── Models/
│   │   ├── Traits/
│   │   │   ├── HasExternalId.php
│   │   │   └── BelongsToTenant.php
│   │   └── Services/
│   │       ├── ImportService.php
│   │       └── EnrollmentService.php
│   └── database/
│       ├── migrations/
│       └── seeders/
├── frontend/                         ← React + Vite
│   └── src/
│       ├── pages/
│       │   ├── auth/
│       │   ├── users/
│       │   ├── schools/
│       │   ├── subjects/
│       │   ├── classes/
│       │   ├── roles/
│       │   ├── permissions/
│       │   └── enrollments/
│       ├── components/
│       │   ├── ui/
│       │   ├── layout/
│       │   └── shared/
│       ├── hooks/
│       ├── services/
│       ├── store/
│       └── utils/
├── docker-compose.yml
└── .env.docker
```

---

## 17. Rotas da API

```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

GET    /api/users
POST   /api/users
GET    /api/users/{external_id}
PUT    /api/users/{external_id}
DELETE /api/users/{external_id}
POST   /api/users/import
GET    /api/users/template

GET    /api/schools
POST   /api/schools
GET    /api/schools/{external_id}
PUT    /api/schools/{external_id}
DELETE /api/schools/{external_id}

GET    /api/subjects
POST   /api/subjects
GET    /api/subjects/{external_id}
PUT    /api/subjects/{external_id}
DELETE /api/subjects/{external_id}

GET    /api/classes
POST   /api/classes
GET    /api/classes/{external_id}
PUT    /api/classes/{external_id}
DELETE /api/classes/{external_id}
POST   /api/classes/{external_id}/subjects
DELETE /api/classes/{external_id}/subjects/{subject_external_id}

GET    /api/roles
POST   /api/roles
GET    /api/roles/{external_id}
PUT    /api/roles/{external_id}
DELETE /api/roles/{external_id}
PUT    /api/roles/{external_id}/permissions

GET    /api/permissions

GET    /api/enrollments
POST   /api/enrollments
POST   /api/enrollments/bulk
DELETE /api/enrollments/{external_id}
GET    /api/enrollments/student/{user_external_id}
```

---

## 18. Comandos Úteis

```bash
# Subir todos os containers
docker compose up -d

# Derrubar todos os containers
docker compose down

# Ver logs em tempo real
docker compose logs -f

# Acessar o container do Laravel
docker compose exec app bash

# Rodar migrations + seeders
docker compose exec app php artisan migrate --seed

# Rodar apenas os seeders
docker compose exec app php artisan db:seed

# Instalar dependências PHP
docker compose exec app composer install

# Instalar dependências Node
docker compose exec frontend npm install

# Limpar caches do Laravel
docker compose exec app php artisan optimize:clear

# Monitorar a fila (worker)
docker compose logs -f worker

# Acessar MySQL via CLI
docker compose exec mysql mysql -u escola_user -p escola_db

# Rebuild de um container específico
docker compose up -d --build app
```

---

> **Versão:** 1.0 — 04/03/2026
> **Ambiente:** Desenvolvimento Local (Docker)