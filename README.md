# EcoDrop v2

Aplicação web de reciclagem com carteira de VoucherVerde, agendamento de entregas, missões e parceiros.

**Stack v2:** Python 3.12 + FastAPI + SQLAlchemy + Alembic (backend) · Node.js + Express (frontend)

---

## Pré-requisitos

- Python 3.12+
- Node.js 18+
- MySQL 8+

---

## Instalação

### 1. Variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas credenciais MySQL e uma SECRET_KEY segura
```

### 2. Banco de dados

```sql
CREATE DATABASE ecodrop_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Backend (Python/FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head             # cria as tabelas
python -m app.seed.seed_data     # insere dados iniciais
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend (Node.js)

```bash
cd frontend
npm install
npm run dev
```

---

## URLs

| Serviço   | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:3000        |
| API       | http://localhost:8000        |
| Swagger   | http://localhost:8000/docs   |
| ReDoc     | http://localhost:8000/redoc  |

---

## Docker Compose (alternativa)

```bash
cp .env.example .env   # configure DB_PASSWORD e SECRET_KEY
docker-compose up
```

---

## Rotas principais da API

### Autenticação
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### Usuário
- `GET /users/me`
- `PUT /users/me`
- `GET /users/me/stats`

### Carteira VoucherVerde
- `GET /vouchers/saldo`
- `GET /vouchers/historico`
- `POST /vouchers/usar`

### Coleta e Agendamentos
- `GET /coleta/pontos`
- `GET /coleta/pontos/{id}`
- `POST /coleta/agendamentos`
- `GET /coleta/agendamentos`
- `PUT /coleta/agendamentos/{id}`

### Missões e Parceiros
- `GET /missoes`
- `GET /missoes/ativas`
- `GET /parceiros`
- `GET /parceiros/{id}`

---

## Comandos úteis

```bash
# Gerar nova migration após alterar modelos
alembic revision --autogenerate -m "descricao"
alembic upgrade head

# Rodar seed novamente (idempotente)
python -m app.seed.seed_data

# Rodar testes (quando banco disponível)
pytest backend/tests/
```

---

## Estrutura

```
backend/
  app/
    core/          # security, dependencies, exceptions
    models/        # SQLAlchemy models
    schemas/       # Pydantic schemas
    routers/       # FastAPI routers
    services/      # lógica de negócio
    repositories/  # acesso ao banco
    seed/          # dados iniciais
  migrations/      # Alembic
  requirements.txt
  Dockerfile

frontend/
  public/
    index.html
    script.js
    api.js         # cliente HTTP centralizado
    css/
    assets/
  server.js
  package.json

docker-compose.yml
.env.example
```
