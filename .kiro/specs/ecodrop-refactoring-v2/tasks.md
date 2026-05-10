# Tasks — EcoDrop Refatoração v2.0

Tarefas ordenadas por dependência. Cada tarefa referencia o(s) requisito(s) que satisfaz.

---

## Fase 1 — Fundação do Backend

### Tarefa 1.1 — Estrutura de pastas e ambiente Python
**Requisito:** 1, 4  
Criar a estrutura de diretórios do backend e o ambiente virtual Python.

- Criar `backend/app/` com subpastas: `models/`, `schemas/`, `routers/`, `services/`, `repositories/`, `core/`, `seed/`
- Criar `backend/tests/`
- Criar `backend/migrations/versions/`
- Criar `backend/.venv/` via `python -m venv .venv`
- Criar `backend/requirements.txt` com versões fixas:
  ```
  fastapi==0.111.0
  uvicorn[standard]==0.30.1
  sqlalchemy==2.0.30
  alembic==1.13.1
  pymysql==1.1.0
  cryptography==42.0.5
  pydantic==2.7.1
  pydantic-settings==2.2.1
  python-jose[cryptography]==3.3.0
  passlib[bcrypt]==1.7.4
  python-dotenv==1.0.1
  python-multipart==0.0.9
  pytest==8.2.0
  httpx==0.27.0
  pytest-asyncio==0.23.6
  ```
- Instalar dependências: `pip install -r requirements.txt`
- Criar `__init__.py` em cada subpasta de `app/`

**Critério de aceite:** `python -c "import fastapi, sqlalchemy, alembic"` executa sem erro.

---

### Tarefa 1.2 — Variáveis de ambiente e configuração
**Requisito:** 1, 24  
Criar `.env.example` na raiz e `backend/app/config.py`.

- Criar `.env.example` na raiz com todas as variáveis documentadas (ver design)
- Criar `.env` na raiz a partir do `.env.example` (não versionado)
- Criar `backend/app/config.py`:
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
      ENVIRONMENT: str = "development"
      DEBUG: bool = True
      ALLOWED_ORIGINS: str = "http://localhost:3000"

      model_config = {"env_file": str(ROOT_DIR / ".env"), "extra": "ignore"}

  settings = Settings()
  ```
- Atualizar `.gitignore` para incluir `.env`, `backend/.venv/`, `node_modules/`

**Critério de aceite:** `python -c "from app.config import settings; print(settings.DATABASE_URL)"` imprime a URL configurada.

---

### Tarefa 1.3 — Conexão com banco de dados
**Requisito:** 4  
Criar `backend/app/database.py` com engine e sessão SQLAlchemy.

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

**Critério de aceite:** `python -c "from app.database import engine; engine.connect()"` conecta sem erro.

---

### Tarefa 1.4 — Modelos SQLAlchemy
**Requisito:** 2  
Criar todos os modelos em `backend/app/models/`.

- `models/base.py`: `Base(DeclarativeBase)` + `TimestampMixin` com `created_at` e `updated_at`
- `models/user.py`: modelo `User` com todos os campos, `UniqueConstraint` em email e cpf, relacionamentos com `back_populates`
- `models/voucher.py`: modelos `VoucherVerde` (saldo_atual com `CheckConstraint >= 0`) e `Transacao`
- `models/coleta.py`: modelos `PontoColeta` (materiais_aceitos como JSON) e `Agendamento`
- `models/missao.py`: modelos `Missao` e `ProgressoMissao` (UniqueConstraint em user_id + missao_id)
- `models/parceiro.py`: modelo `Parceiro`
- `models/refresh_token.py`: modelo `RefreshToken` com `token_hash`, `expires_at`, `revoked`
- `models/__init__.py`: importar todos os modelos explicitamente

**Critério de aceite:** `python -c "from app.models import Base; print(Base.metadata.tables.keys())"` lista todas as tabelas.

---

### Tarefa 1.5 — Configuração do Alembic e migration inicial
**Requisito:** 3  
Inicializar Alembic e gerar a migration do schema completo.

- Executar `alembic init migrations` dentro de `backend/`
- Editar `migrations/env.py` para importar `Base` e todos os modelos, e ler `DATABASE_URL` via `settings`
- Editar `alembic.ini` para apontar `script_location = migrations`
- Criar banco MySQL: `CREATE DATABASE ecodrop_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
- Executar `alembic revision --autogenerate -m "initial_schema"`
- Revisar o arquivo gerado em `migrations/versions/`
- Executar `alembic upgrade head`

**Critério de aceite:** `alembic current` mostra a migration aplicada; `SHOW TABLES;` no MySQL lista todas as tabelas.

---

### Tarefa 1.6 — Aplicação FastAPI base
**Requisito:** 16, 17, 22  
Criar `backend/app/main.py` com CORS, health check e handlers de erro.

- Criar `core/exceptions.py` com handlers para `RequestValidationError`, `HTTPException` e exceção genérica
- Criar `app/main.py`:
  - Instanciar `FastAPI(title="EcoDrop API", version="2.0.0")`
  - Adicionar `CORSMiddleware` com origens de `settings.ALLOWED_ORIGINS`
  - Registrar exception handlers de `core/exceptions.py`
  - Endpoint `GET /health` retornando `{"status": "ok", "version": "2.0.0"}`
- Testar: `uvicorn app.main:app --reload --port 8000` e acessar `http://localhost:8000/health`

**Critério de aceite:** `GET /health` retorna 200; `GET /docs` abre Swagger UI.

---

## Fase 2 — Autenticação e Usuários

### Tarefa 2.1 — Segurança: bcrypt e JWT
**Requisito:** 5  
Criar `backend/app/core/security.py`.

```python
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str: ...
def verify_password(plain: str, hashed: str) -> bool: ...
def create_access_token(data: dict) -> str: ...   # expira em ACCESS_TOKEN_EXPIRE_MINUTES
def create_refresh_token(data: dict) -> str: ...  # expira em REFRESH_TOKEN_EXPIRE_DAYS
def decode_token(token: str) -> dict: ...         # lança HTTPException 401 se inválido
```

**Critério de aceite:** testes manuais de hash/verify e encode/decode passam.

---

### Tarefa 2.2 — Schemas de autenticação e usuário
**Requisito:** 6  
Criar schemas Pydantic em `backend/app/schemas/`.

- `schemas/auth.py`: `LoginRequest`, `TokenResponse`, `RefreshRequest`
- `schemas/user.py`: `UserCreate` (com validação de CPF e email), `UserUpdate`, `UserResponse`, `UserStats`

**Critério de aceite:** `from app.schemas.user import UserCreate; UserCreate(...)` valida corretamente.

---

### Tarefa 2.3 — Repository de usuário
**Requisito:** 14  
Criar `backend/app/repositories/base.py` e `repositories/user_repo.py`.

- `repositories/base.py`: `CRUDBase` genérico com `get`, `get_multi`, `create`, `update`, `delete`
- `repositories/user_repo.py`: herda `CRUDBase[User]`, adiciona `get_by_email(db, email)` e `get_by_cpf(db, cpf)`

---

### Tarefa 2.4 — AuthService
**Requisito:** 15  
Criar `backend/app/services/auth_service.py`.

- `register(db, data)`: verifica unicidade de email e CPF (409 se duplicado), faz hash da senha, cria `User` e `VoucherVerde` inicial na mesma transação, retorna `UserResponse`
- `login(db, data)`: busca usuário, verifica senha, gera access + refresh token, armazena hash do refresh em `refresh_tokens`, retorna `TokenResponse`
- `refresh_token(db, token)`: valida token, verifica que não está revogado no banco, gera novo access token
- `logout(db, token)`: marca refresh token como `revoked=True`

---

### Tarefa 2.5 — Dependency `get_current_user`
**Requisito:** 5  
Criar `backend/app/core/dependencies.py`.

```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    user = user_repo.get(db, id=payload["sub"])
    if not user:
        raise HTTPException(401, "Usuário não encontrado")
    return user
```

---

### Tarefa 2.6 — Routers de autenticação e usuários
**Requisito:** 7, 8  
Criar `routers/auth.py` e `routers/users.py`, registrar em `main.py`.

- `POST /auth/register` → `auth_service.register`
- `POST /auth/login` → `auth_service.login`
- `POST /auth/refresh` → `auth_service.refresh_token`
- `POST /auth/logout` → `auth_service.logout`
- `GET /users/me` → retorna `UserResponse` do usuário autenticado
- `PUT /users/me` → atualiza campos permitidos
- `GET /users/me/stats` → retorna `UserStats`

**Critério de aceite:** fluxo completo register → login → GET /users/me funciona via Swagger UI.

---

## Fase 3 — Features de Negócio

### Tarefa 3.1 — Repository e Service de VoucherVerde
**Requisito:** 9, 14, 15  
Criar `repositories/voucher_repo.py` e `services/voucher_service.py`.

- `voucher_repo`: `get_by_user(db, user_id)`, `add_transacao(db, voucher_id, tipo, valor, descricao)`
- `voucher_service`:
  - `get_saldo(db, user_id) -> VoucherSaldo`: calcula `progresso_proximo_nivel` com base em `xp_total`
  - `get_historico(db, user_id) -> list[TransacaoResponse]`: paginado, ordem decrescente
  - `usar(db, user_id, parceiro_id, valor)`: SELECT FOR UPDATE no voucher, verifica saldo ≥ valor, debita, cria transação de saída
  - `creditar(db, user_id, valor, descricao)`: chamado internamente, cria transação de entrada

**Critério de aceite:** saldo nunca fica negativo; transação de saída com saldo insuficiente retorna 400.

---

### Tarefa 3.2 — Router de VoucherVerde
**Requisito:** 9  
Criar `routers/vouchers.py` e registrar em `main.py`.

- `GET /vouchers/saldo`
- `GET /vouchers/historico`
- `POST /vouchers/usar`

---

### Tarefa 3.3 — Repository e Service de Coleta
**Requisito:** 10, 11, 14, 15  
Criar `repositories/coleta_repo.py` e `services/coleta_service.py`.

- `coleta_repo`: `get_pontos_by_material(db, material?)`, `get_agendamentos_by_user(db, user_id)`
- `coleta_service`:
  - `listar_pontos(db, material?)`: filtra por `materiais_aceitos` JSON se material fornecido
  - `criar_agendamento(db, user_id, data)`: valida que ponto existe e está ativo, cria agendamento
  - `atualizar_status(db, user_id, agendamento_id, status)`: verifica ownership (403 se outro usuário)

---

### Tarefa 3.4 — Router de Coleta
**Requisito:** 10, 11  
Criar `routers/coletas.py` e registrar em `main.py`.

- `GET /coleta/pontos`
- `GET /coleta/pontos/{id}`
- `POST /coleta/agendamentos`
- `GET /coleta/agendamentos`
- `PUT /coleta/agendamentos/{id}`

---

### Tarefa 3.5 — Service e Router de Missões
**Requisito:** 12, 15  
Criar `services/missao_service.py` e `routers/missoes.py`.

- `missao_service`:
  - `get_ativas(db, user_id)`: retorna missões com `ProgressoMissao` do usuário, calcula percentual
  - `atualizar_progresso(db, user_id, tipo_material, quantidade)`: incrementa `progresso_atual` nas missões ativas do tipo correspondente
  - `verificar_conclusao(db, user_id)`: para cada missão onde `progresso_atual >= meta_quantidade`, marca `concluida=True`, chama `voucher_service.creditar` e atualiza `xp_total` do usuário
- `GET /missoes`
- `GET /missoes/ativas`

---

### Tarefa 3.6 — Router de Parceiros
**Requisito:** 13  
Criar `routers/parceiros.py` e registrar em `main.py`.

- `GET /parceiros` com filtro opcional `?categoria=`
- `GET /parceiros/{id}` com 404 se não encontrado

---

### Tarefa 3.7 — Seed data
**Requisito:** 21  
Criar `backend/app/seed/seed_data.py`.

- 5 pontos de coleta em Manaus-AM com coordenadas reais (lat/lng)
- 4 parceiros (supermercado, contas, alimentação, farmácia)
- 3 missões ativas com metas e recompensas
- Verificar existência antes de inserir (idempotente)
- Executar: `python -m app.seed.seed_data`

**Critério de aceite:** executar duas vezes não duplica dados.

---

## Fase 4 — Frontend Server e Integração

### Tarefa 4.1 — Servidor Node.js para o frontend
**Requisito:** 18  
Criar `frontend/server.js` e `frontend/package.json`.

```javascript
// frontend/server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Frontend: http://localhost:${PORT}`));
```

```json
// frontend/package.json
{
  "name": "ecodrop-frontend",
  "version": "2.0.0",
  "scripts": { "start": "node server.js", "dev": "nodemon server.js" },
  "dependencies": { "express": "4.18.2" },
  "devDependencies": { "nodemon": "3.0.1" }
}
```

- Mover `frontend/index.html`, `frontend/script.js`, `frontend/css/`, `frontend/assets/` para `frontend/public/`

**Critério de aceite:** `npm run dev` serve `http://localhost:3000` com o frontend atual.

---

### Tarefa 4.2 — Cliente API centralizado (`api.js`)
**Requisito:** 19  
Criar `frontend/public/api.js` com todos os métodos documentados no design.

Implementar:
- `_getToken()`, `_headers()`, `_handleResponse(res)` (redireciona para login em 401)
- Todos os métodos: `login`, `register`, `logout`, `getMe`, `getStats`, `updateMe`, `getSaldo`, `getHistorico`, `usarVoucher`, `getPontos`, `criarAgendamento`, `getAgendamentos`, `getMissoes`, `getMissoesAtivas`, `getParceiros`, `getParceiro`
- Adicionar `<script src="api.js"></script>` no `index.html` antes de `script.js`

---

### Tarefa 4.3 — Integração: autenticação no frontend
**Requisito:** 20  
Adaptar funções de login e cadastro em `script.js`.

- Substituir `fazerLogin()` para chamar `api.login(email, senha)` e armazenar tokens
- Substituir `fazerCadastro()` para chamar `api.register(userData)`
- Substituir `fazerLogout()` para chamar `api.logout()`
- Substituir verificação de sessão para usar token do localStorage

---

### Tarefa 4.4 — Integração: telas Home, Carteira e Perfil
**Requisito:** 20  
Adaptar carregamento de dados das telas principais.

- **Home**: substituir dados hardcoded por `api.getSaldo()` + `api.getMissoesAtivas()`
- **Carteira**: substituir por `api.getSaldo()` + `api.getHistorico()`
- **Perfil**: substituir por `api.getMe()` + `api.getStats()`

---

### Tarefa 4.5 — Integração: Mapa e Parceiros
**Requisito:** 20  
Adaptar telas de mapa e parceiros.

- **Mapa**: substituir `DEFAULT_POINTS` por `api.getPontos()`, manter filtros por material chamando `api.getPontos(material)`
- **Parceiros**: substituir dados hardcoded por `api.getParceiros()`
- **Agendamento**: chamar `api.criarAgendamento(dados)` ao confirmar

---

## Fase 5 — Qualidade e Finalização

### Tarefa 5.1 — Testes unitários do backend
**Requisito:** 23  
Criar suite de testes com pytest.

- `tests/conftest.py`: fixture com banco SQLite em memória, `TestClient` do FastAPI, usuário de teste
- `tests/test_auth.py`:
  - Registro com dados válidos → 201
  - Registro com email duplicado → 409
  - Registro com CPF duplicado → 409
  - Login com credenciais válidas → 200 com tokens
  - Login com senha errada → 401
  - GET /users/me sem token → 401
  - GET /users/me com token válido → 200
- `tests/test_vouchers.py`:
  - Saldo inicial após registro → 0
  - Crédito aumenta saldo
  - Débito diminui saldo
  - Débito com saldo insuficiente → 400

**Critério de aceite:** `pytest backend/tests/` passa sem erros.

---

### Tarefa 5.2 — Tratamento de erros padronizado
**Requisito:** 17  
Revisar e completar `core/exceptions.py`.

- Handler para `RequestValidationError` → 422 com campos detalhados
- Handler para `HTTPException` → repassa status e detail
- Handler genérico para `Exception` → 500 sem expor stack trace em produção (`ENVIRONMENT != development`)
- Garantir que nenhum endpoint expõe `senha_hash` ou detalhes internos

---

### Tarefa 5.3 — Documentação OpenAPI
**Requisito:** 22  
Completar metadados da API para Swagger UI.

- Adicionar `description`, `contact`, `license_info` no objeto `FastAPI`
- Adicionar `summary` e `description` em cada endpoint
- Verificar que todos os schemas de resposta estão corretos no `/docs`
- Testar `/redoc`

---

### Tarefa 5.4 — Docker Compose (opcional)
**Requisito:** 25  
Criar `docker-compose.yml` na raiz.

```yaml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ecodrop_db
    volumes: [mysql_data:/var/lib/mysql]
    ports: ["3306:3306"]

  backend:
    build: ./backend
    depends_on: [mysql]
    ports: ["8000:8000"]
    env_file: .env

volumes:
  mysql_data:
```

- Criar `backend/Dockerfile` com imagem Python 3.12-slim
- Testar `docker-compose up`

---

### Tarefa 5.5 — README atualizado
**Requisito:** 1  
Atualizar `README.md` com instruções da v2.

- Pré-requisitos: Python 3.12+, Node.js 18+, MySQL 8+
- Passos de instalação: `.env`, venv, `pip install`, `alembic upgrade head`, seed, `uvicorn`
- Passos do frontend: `npm install`, `npm run dev`
- URLs: frontend `:3000`, API `:8000`, docs `:8000/docs`
- Comandos úteis: alembic, pytest, seed

---

## Ordem de Execução Resumida

```
1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6
                              ↓
                    2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6
                                                    ↓
                              3.1 → 3.2
                              3.3 → 3.4
                              3.5
                              3.6
                              3.7
                                ↓
                    4.1 → 4.2 → 4.3 → 4.4 → 4.5
                                              ↓
                              5.1 → 5.2 → 5.3 → 5.4 → 5.5
```

Tarefas 3.1–3.7 podem ser desenvolvidas em paralelo após a Fase 2. Tarefas 5.1–5.5 são independentes entre si.
