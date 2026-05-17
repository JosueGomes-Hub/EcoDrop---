# Deploy EcoDrop no Railway — Guia Completo

> **Stack:** Python 3.12 + FastAPI + SQLAlchemy + Alembic + PostgreSQL  
> **Branch:** `refactor/walter-ajustes-backend-2026-05-15`  
> **Objetivo:** manter o backend disponível por 3 dias completos dentro do trial gratuito de $5

---

## Passo 1 — Ajustes no código

Fazer as alterações abaixo na branch antes do deploy, depois commit e push.

### `backend/requirements.txt`

Substituir `pymysql` e `cryptography` por `psycopg2-binary`:

```
fastapi==0.115.12
uvicorn[standard]==0.30.1
sqlalchemy==2.0.41
alembic==1.13.1
psycopg2-binary==2.9.9
pydantic==2.11.4
pydantic-settings==2.9.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
python-dotenv==1.0.1
python-multipart==0.0.9
email-validator==2.2.0
```

---

### `backend/app/config.py`

Simplificar para usar a `DATABASE_URL` injetada diretamente pelo Railway:

```python
from pydantic_settings import BaseSettings
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    DATABASE_URL: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    ALLOWED_ORIGINS: str = "*"
    CORS_ALLOW_ALL: bool = True

    model_config = {"env_file": str(ROOT_DIR / ".env"), "extra": "ignore"}


settings = Settings()
```

---

### `backend/app/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

### `backend/Dockerfile`

Adicionar migration e seed automáticos no `CMD`:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD alembic upgrade head && python -m app.seed.seed_data && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

### `frontend/public/api.js`

Substituir a linha de `API_BASE` pela URL gerada pelo Railway após o deploy:

```javascript
// de
const API_BASE = `${window.location.protocol}//${window.location.hostname}:8000`;

// para
const API_BASE = "https://sua-url-gerada.up.railway.app";
```

> A URL exata só estará disponível após o Passo 6.

---

## Passo 2 — Criar conta no Railway

1. Acesse [railway.app](https://railway.app)
2. Clique em **Login with GitHub**
3. Autorize o acesso ao repositório do EcoDrop
4. Conclua a verificação de conta via GitHub — isso garante o **Full Trial** com acesso total à rede

---

## Passo 3 — Criar o projeto e o banco PostgreSQL

1. No dashboard → **New Project**
2. Clique em **Add a service** → **Database** → **PostgreSQL**
3. O Railway sobe o banco e gera as variáveis de conexão automaticamente

---

## Passo 4 — Deploy do backend

1. Ainda no mesmo projeto → **Add a service** → **GitHub Repo**
2. Selecione o repositório `EcoDrop---`
3. Selecione a branch `refactor/walter-ajustes-backend-2026-05-15`
4. Em **Root Directory** informe: `backend`
5. O Railway detecta o `Dockerfile` automaticamente e inicia o build

---

## Passo 5 — Variáveis de ambiente

No serviço do backend → aba **Variables** → adicionar as seguintes variáveis:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | clique em **Add Reference** → selecione `PostgreSQL` → `DATABASE_URL` |
| `SECRET_KEY` | string longa e aleatória — gere com `openssl rand -hex 32` no terminal |
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |
| `CORS_ALLOW_ALL` | `true` |

> O `DATABASE_URL` é referenciado diretamente do serviço PostgreSQL — não precisa digitar o valor manualmente.

---

## Passo 6 — Verificar o deploy

Após o build terminar, o Railway exibe a URL pública no formato:

```
https://ecodrop-backend-xxxx.up.railway.app
```

Acesse os endpoints abaixo para confirmar que está tudo funcionando:

| Endpoint | Esperado |
|---|---|
| `/health` | `{"status": "ok", "version": "2.0.0"}` |
| `/docs` | Swagger UI com todas as rotas listadas |

---

## Passo 7 — Keep-alive (obrigatório para 3 dias contínuos)

O Railway pode colocar o serviço em sleep se não houver tráfego. Para evitar isso:

1. Acesse [uptimerobot.com](https://uptimerobot.com) e crie uma conta gratuita
2. Clique em **New Monitor** e configure:

| Campo | Valor |
|---|---|
| Monitor Type | HTTP(s) |
| Friendly Name | EcoDrop Backend |
| URL | `https://sua-url.up.railway.app/health` |
| Monitoring Interval | 5 minutes |

3. Salve o monitor — ele fará ping a cada 5 minutos, mantendo o serviço ativo pelos 3 dias completos.

---

## Resumo dos serviços no Railway

| Serviço | Função |
|---|---|
| PostgreSQL | Banco de dados gerenciado — provisionado automaticamente |
| Backend (Docker) | FastAPI + Alembic migrations + Seed de dados + Uvicorn |

**Custo estimado para 3 dias:** entre $0,10 e $0,30 — bem dentro dos $5 do trial.

---

## Checklist final

- [ ] `requirements.txt` atualizado com `psycopg2-binary`
- [ ] `config.py` usando `DATABASE_URL` direto
- [ ] `database.py` simplificado
- [ ] `Dockerfile` com migration e seed no `CMD`
- [ ] Commit e push na branch `refactor/walter-ajustes-backend-2026-05-15`
- [ ] Conta Railway criada e GitHub verificado
- [ ] Serviço PostgreSQL criado no projeto
- [ ] Backend deployado com Root Directory `backend`
- [ ] Variáveis de ambiente configuradas
- [ ] `/health` retornando `ok`
- [ ] Monitor UptimeRobot ativo
- [ ] `api.js` atualizado com a URL do Railway
