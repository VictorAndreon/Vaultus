# Vaultus

Aplicação de gestão financeira pessoal construída com Laravel 11, Inertia.js, React e TypeScript, orquestrada via Docker.

## Stack

- **Backend:** PHP 8.4, Laravel 11, Laravel Horizon, PostgreSQL 16, Redis 7
- **Frontend:** React 19, TypeScript, Inertia.js, Tailwind CSS, Vite
- **Infraestrutura:** Docker, Caddy (TLS automático)

---

## Pré-requisitos

- Docker e Docker Compose instalados
- `mkcert` instalado (para TLS local)

---

## Configuração inicial

### 1. Variáveis de ambiente

```bash
cp src/.env.example src/.env
```

Edite `src/.env` com as configurações do banco de dados e da aplicação:

```env
APP_NAME=Vaultus
APP_URL=https://vaultus.local

DB_CONNECTION=pgsql
DB_HOST=db
DB_PORT=5432
DB_DATABASE=vaultus
DB_USERNAME=vaultus
DB_PASSWORD=sua_senha_aqui

REDIS_HOST=redis
REDIS_PORT=6379

CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
```

### 2. Certificado TLS local

```bash
mkcert -install
mkcert vaultus.local
```

Mova os certificados gerados para `docker/caddy/`:

```bash
mkdir -p docker/caddy
mv vaultus.local.pem vaultus.local-key.pem docker/caddy/
```

> Atualize o `Caddyfile` com os caminhos dos certificados caso necessário.

### 3. Adicionar entrada no `/etc/hosts`

```bash
echo "127.0.0.1 vaultus.local" | sudo tee -a /etc/hosts
```

---

## Rodando o projeto

### Subir os containers (produção local)

```bash
docker compose up -d
```

### Subir com hot-reload do frontend (desenvolvimento)

```bash
docker compose --profile dev up -d
```

O servidor Vite ficará disponível em `http://localhost:5173`.

### Primeira execução: instalar dependências e preparar o banco

```bash
# Instalar dependências PHP
docker compose exec app composer install

# Gerar a APP_KEY
docker compose exec app php artisan key:generate

# Rodar as migrations
docker compose exec app php artisan migrate

# (Opcional) Popular com dados de exemplo
docker compose exec app php artisan db:seed

# Instalar dependências Node e compilar assets
docker compose run --rm node npm install
docker compose run --rm node npm run build
```

---

## Comandos do dia a dia

### Artisan

```bash
docker compose exec app php artisan <comando>
```

### Composer

```bash
docker compose exec app composer <comando>
```

### NPM (desenvolvimento com hot-reload já rodando)

```bash
# Instalar novo pacote
docker compose exec node npm install <pacote>
```

### Testes

```bash
docker compose exec app php artisan test
```

O banco `vaultus_test` é criado automaticamente pelo script de inicialização do PostgreSQL (`docker/postgres/init.sql`).

### Logs em tempo real

```bash
# Todos os serviços
docker compose logs -f

# Apenas a aplicação
docker compose logs -f app

# Apenas o Horizon (filas)
docker compose logs -f horizon
```

---

## Serviços

| Serviço     | Descrição                          | Porta          |
|-------------|------------------------------------|----------------|
| `caddy`     | Servidor web + TLS                 | 80, 443        |
| `app`       | PHP-FPM (Laravel)                  | —              |
| `db`        | PostgreSQL 16                      | 5432 (local)   |
| `redis`     | Cache, sessões e filas             | —              |
| `horizon`   | Processamento de filas             | —              |
| `scheduler` | Agendamento de tarefas (1 min)     | —              |
| `node`      | Vite dev server (perfil `dev`)     | 5173           |

---

## Parar os containers

```bash
docker compose down
```

Para remover também os volumes (banco de dados):

```bash
docker compose down -v
```
