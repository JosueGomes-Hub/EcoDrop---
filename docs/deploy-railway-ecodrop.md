# Deploy EcoDrop — Railway (Backend) + Vercel (Frontend)

> **Stack:** Python 3.12 + FastAPI + PostgreSQL · HTML/CSS/JS Vanilla  
> **Branch:** `refactor/walter-ajustes-backend-2026-05-15`  
> **Objetivo:** backend disponível por 3 dias completos + frontend estático permanente

---

## Parte 1 — Backend no Railway

### Passo 1 — Ajustes no código (backend)

Fazer as alterações abaixo na branch antes do deploy, depois commit e push.

#### `backend/requirements.txt`

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

#### `backend/app/config.py`

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

#### `backend/app/database.py`

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

#### `backend/Dockerfile`

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

### Passo 2 — Criar conta no Railway

1. Acesse [railway.app](https://railway.app)
2. Clique em **Login with GitHub**
3. Autorize o acesso ao repositório do EcoDrop
4. Conclua a verificação de conta via GitHub — isso garante o **Full Trial** com acesso total à rede

---

### Passo 3 — Criar o projeto e o banco PostgreSQL

1. No dashboard → **New Project**
2. Clique em **Add a service** → **Database** → **PostgreSQL**
3. O Railway sobe o banco e gera as variáveis de conexão automaticamente

---

### Passo 4 — Deploy do backend

1. Ainda no mesmo projeto → **Add a service** → **GitHub Repo**
2. Selecione o repositório `EcoDrop---`
3. Selecione a branch `refactor/walter-ajustes-backend-2026-05-15`
4. Em **Root Directory** informe: `backend`
5. O Railway detecta o `Dockerfile` automaticamente e inicia o build

---

### Passo 5 — Variáveis de ambiente

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

### Passo 6 — Verificar o deploy do backend

Após o build terminar, o Railway exibe a URL pública no formato:

```
https://ecodrop-backend-xxxx.up.railway.app
```

Acesse os endpoints abaixo para confirmar:

| Endpoint | Esperado |
|---|---|
| `/health` | `{"status": "ok", "version": "2.0.0"}` |
| `/docs` | Swagger UI com todas as rotas listadas |

> **Guarde essa URL** — ela será usada no passo do frontend.

---

### Passo 7 — Keep-alive (obrigatório para 3 dias contínuos)

O Railway pode colocar o serviço em sleep sem tráfego. Para evitar:

1. Acesse [uptimerobot.com](https://uptimerobot.com) e crie uma conta gratuita
2. Clique em **New Monitor** e configure:

| Campo | Valor |
|---|---|
| Monitor Type | HTTP(s) |
| Friendly Name | EcoDrop Backend |
| URL | `https://sua-url.up.railway.app/health` |
| Monitoring Interval | 5 minutes |

3. Salve — o monitor fará ping a cada 5 minutos pelos 3 dias completos.

---

## Parte 2 — Frontend no Vercel

### Passo 8 — Ajustes no código (frontend)

Três arquivos precisam ser alterados antes do deploy.

#### `frontend/public/index.html`

Corrigir o caminho do favicon (linha 5):

```html
<!-- de -->
<link rel="icon" type="image/png" href="/frontend/assets/Logo.png"/>

<!-- para -->
<link rel="icon" type="image/png" href="/assets/Logo.png"/>
```

---

#### `frontend/public/api.js`

Substituir a linha de `API_BASE` pela URL gerada pelo Railway no Passo 6:

```javascript
// de
const API_BASE = `${window.location.protocol}//${window.location.hostname}:8000`;

// para
const API_BASE = "https://sua-url-gerada.up.railway.app";
```

---

#### `frontend/public/vercel.json` ← arquivo novo

Criar este arquivo dentro de `frontend/public/`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Isso garante que o Vercel sirva o `index.html` para qualquer rota, necessário para o SPA funcionar corretamente.

---

### Passo 9 — Criar conta no Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **Sign Up** → **Continue with GitHub**
3. Autorize o acesso ao repositório do EcoDrop

---

### Passo 10 — Deploy do frontend

1. No dashboard → **Add New** → **Project**
2. Selecione o repositório `EcoDrop---`
3. Na tela de configuração:

| Campo | Valor |
|---|---|
| **Framework Preset** | Other |
| **Root Directory** | `frontend/public` |
| **Build Command** | *(deixar vazio)* |
| **Output Directory** | *(deixar vazio)* |

4. Clique em **Deploy**

O Vercel detecta que é um site estático e publica automaticamente.

---

### Passo 11 — Verificar o deploy do frontend

Após o deploy, o Vercel gera uma URL no formato:

```
https://ecodrop-xxxx.vercel.app
```

Acesse e confirme:
- Splash screen carrega corretamente
- Logo aparece (assets servindo)
- Login funciona e chama o backend no Railway

---

## Resumo da arquitetura final

```
Usuário
   │
   ▼
Vercel (frontend estático)
https://ecodrop-xxxx.vercel.app
   │  fetch() via api.js
   ▼
Railway (backend FastAPI)
https://ecodrop-xxxx.up.railway.app
   │  SQLAlchemy
   ▼
Railway (PostgreSQL)
```

---

## Resumo dos serviços

| Serviço | Plataforma | Função | Custo |
|---|---|---|---|
| PostgreSQL | Railway | Banco de dados gerenciado | dentro do trial $5 |
| Backend (Docker) | Railway | FastAPI + Alembic + Seed | dentro do trial $5 |
| Frontend (estático) | Vercel | HTML/CSS/JS Vanilla | **gratuito permanente** |

**Custo estimado para 3 dias no Railway:** entre $0,10 e $0,30.  
**Vercel:** gratuito sem limite de tempo para sites estáticos.

---

## Checklist final

### Backend (Railway)
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

### Frontend (Vercel)
- [ ] Favicon corrigido em `index.html`
- [ ] `api.js` atualizado com a URL do Railway
- [ ] `vercel.json` criado em `frontend/public/`
- [ ] Commit e push das alterações
- [ ] Conta Vercel criada e GitHub conectado
- [ ] Deploy configurado com Root Directory `frontend/public`
- [ ] Frontend acessível e conectado ao backend