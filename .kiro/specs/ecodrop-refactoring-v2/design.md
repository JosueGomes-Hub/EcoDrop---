# Design — EcoDrop Refatoração v2.0

## Visão Geral

A refatoração migra o backend de Node.js/Express + MySQL (com SQL raw) para **Python FastAPI + SQLAlchemy + Alembic + MySQL**, mantendo o frontend em HTML/CSS/JS Vanilla mas substituindo o LiveServer por um **servidor Node.js/Express dedicado**. O objetivo é persistência real de dados, autenticação JWT robusta, migrations versionadas e separação clara de camadas.

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────┐
│  NAVEGADOR  (HTML + CSS + JS Vanilla — SPA)             │
└──────────────────┬──────────────────────────────────────┘
                   │ fetch() via api.js
                   ▼
┌─────────────────────────────────────────────────────────┐
│  FRONTEND SERVER  Node.js + Express  :3000              │
│  express.static → public/  (index.html, script.js …)   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  BACKEND API  Python FastAPI + Uvicorn  :8000           │
│  Routers → Services → Repositories → SQLAlchemy ORM    │
│  JWT (python-jose) · Pydantic v2 · CORS                 │
└──────────────────┬──────────────────────────────────────┘
                   │ SQLAlchemy + PyMySQL
                   ▼
┌─────────────────────────────────────────────────────────┐
│  MySQL 8.x  :3306                                       │
│  Schema gerenciado pelo Alembic                         │
└─────────────────────────────────────────────────────────┘
```

### Decisões de Design

| Decisão | Justificativa |
|---|---|
| FastAPI + Uvicorn | ASGI, tipagem nativa, OpenAPI automático, performance superior ao Express para APIs |
| SQLAlchemy 2.x | ORM maduro, integração nativa com Alembic, suporte completo a MySQL |
| Alembic | Migrations versionadas e reversíveis; autogenerate a partir dos modelos Python |
| PyMySQL | Driver MySQL puro-Python, sem dependência de binários nativos |
| Access + Refresh Token | Access de 30 min (segurança), Refresh de 7 dias (UX); blacklist de refresh no DB |
| Repository pattern | Isola SQL/ORM dos services; facilita testes unitários com mocks |
| Node.js frontend server | Elimina dependência do LiveServer/VS Code; serve produção e dev com nodemon |
| `.env` único na raiz | Compartilhado entre backend (pydantic-settings) e frontend server (dotenv) |

---

## Estrutura de Pastas

```
ecodrop/
├── .env                          # Variáveis de ambiente (não versionado)
├── .env.example                  # Template versionado
├── .gitignore
├── docker-compose.yml            # MySQL + backend (opcional)
│
├── backend/
│   ├── .venv/                    # Ambiente virtual Python (não versionado)
│   ├── alembic.ini
│   ├── requirements.txt
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI app, CORS, routers
│   │   ├── config.py             # pydantic-settings lendo .env da raiz
│   │   ├── database.py           # engine, SessionLocal, get_db()
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py       # Exporta todos os modelos (crítico para Alembic)
│   │   │   ├── base.py           # Base declarativa + TimestampMixin
│   │   │   ├── user.py
│   │   │   ├── voucher.py        # VoucherVerde + Transacao
│   │   │   ├── coleta.py         # PontoColeta + Agendamento
│   │   │   ├── missao.py         # Missao + ProgressoMissao
│   │   │   └── parceiro.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── auth.py
│   │   │   ├── voucher.py
│   │   │   ├── coleta.py
│   │   │   ├── missao.py
│   │   │   └── parceiro.py
│   │   │
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── vouchers.py
│   │   │   ├── coletas.py
│   │   │   ├── missoes.py
│   │   │   └── parceiros.py
│   │   │
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── voucher_service.py
│   │   │   ├── coleta_service.py
│   │   │   └── missao_service.py
│   │   │
│   │   ├── repositories/
│   │   │   ├── base.py           # CRUDBase genérico
│   │   │   ├── user_repo.py
│   │   │   ├── voucher_repo.py
│   │   │   └── coleta_repo.py
│   │   │
│   │   ├── core/
│   │   │   ├── security.py       # bcrypt + JWT
│   │   │   ├── dependencies.py   # get_db(), get_current_user()
│   │   │   └── exceptions.py     # handlers HTTP customizados
│   │   │
│   │   └── seed/
│   │       └── seed_data.py
│   │
│   ├── migrations/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       └── test_vouchers.py
│
└── frontend/
    ├── server.js                 # Express estático (substitui LiveServer)
    ├── package.json
    └── public/
        ├── index.html
        ├── style.css
        ├── script.js             # Adaptado para usar api.js
        ├── api.js                # Cliente centralizado fetch()
        └── assets/
```

---

## Modelos de Dados (SQLAlchemy)

### Base e Mixin

```python
# app/models/base.py
class Base(DeclarativeBase): pass

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
```

### Tabelas e Campos

#### `users`
| Campo | Tipo | Restrições |
|---|---|---|
| id | Integer PK | autoincrement |
| nome | String(100) | not null |
| sobrenome | String(100) | not null |
| email | String(255) | unique, not null |
| cpf | String(14) | unique, not null |
| celular | String(15) | nullable |
| cep | String(9) | nullable |
| cidade | String(100) | nullable |
| estado | String(2) | nullable |
| senha_hash | String(255) | not null |
| nivel | Integer | default 1 |
| xp_total | Integer | default 0 |
| created_at / updated_at | DateTime | TimestampMixin |

Relacionamentos: 1:1 → `vouchers`, 1:N → `agendamentos`, 1:N → `progresso_missao`

#### `vouchers`
| Campo | Tipo | Restrições |
|---|---|---|
| id | Integer PK | |
| user_id | Integer FK | → users.id, unique |
| saldo_atual | Numeric(10,2) | default 0, check ≥ 0 |
| nivel_bonus_pct | Numeric(5,2) | default 0 |

Relacionamentos: N:1 → `users`, 1:N → `transacoes`

#### `transacoes`
| Campo | Tipo | Restrições |
|---|---|---|
| id | Integer PK | |
| voucher_id | Integer FK | → vouchers.id |
| tipo | Enum | 'entrada', 'saida' |
| valor | Numeric(10,2) | not null |
| descricao | String(255) | nullable |
| created_at | DateTime | |

#### `pontos_coleta`
| Campo | Tipo | Restrições |
|---|---|---|
| id | Integer PK | |
| nome | String(150) | not null |
| endereco | String(255) | not null |
| lat | Numeric(10,7) | nullable |
| lng | Numeric(10,7) | nullable |
| distancia_km | Numeric(6,2) | nullable |
| status | Enum | 'active', 'inactive' |
| materiais_aceitos | JSON | lista de slugs |

Relacionamentos: 1:N → `agendamentos`

#### `agendamentos`
| Campo | Tipo | Restrições |
|---|---|---|
| id | Integer PK | |
| user_id | Integer FK | → users.id |
| ponto_id | Integer FK | → pontos_coleta.id |
| horario | DateTime | not null |
| status | Enum | 'pending', 'confirmed', 'cancelled', 'completed' |
| material_tipo | String(50) | nullable |

#### `missoes`
| Campo | Tipo | Restrições |
|---|---|---|
| id | Integer PK | |
| titulo | String(150) | not null |
| descricao | Text | nullable |
| xp_recompensa | Integer | default 0 |
| voucher_recompensa | Numeric(10,2) | default 0 |
| meta_quantidade | Numeric(10,2) | not null |
| tipo_material | String(50) | nullable |

Relacionamentos: 1:N → `progresso_missao`

#### `progresso_missao`
| Campo | Tipo | Restrições |
|---|---|---|
| id | Integer PK | |
| user_id | Integer FK | → users.id |
| missao_id | Integer FK | → missoes.id |
| progresso_atual | Numeric(10,2) | default 0 |
| concluida | Boolean | default false |

UniqueConstraint: (user_id, missao_id)

#### `parceiros`
| Campo | Tipo | Restrições |
|---|---|---|
| id | Integer PK | |
| nome | String(150) | not null |
| categoria | String(50) | not null |
| descricao | Text | nullable |
| beneficio | String(255) | nullable |
| ativo | Boolean | default true |

#### `refresh_tokens` (blacklist)
| Campo | Tipo | Restrições |
|---|---|---|
| id | Integer PK | |
| user_id | Integer FK | → users.id |
| token_hash | String(255) | unique, not null |
| expires_at | DateTime | not null |
| revoked | Boolean | default false |

---

## Schemas Pydantic

### Auth
```
LoginRequest:      email, senha
TokenResponse:     access_token, refresh_token, token_type="bearer"
RefreshRequest:    refresh_token
```

### User
```
UserCreate:        nome, sobrenome, email, cpf, senha, celular, cep, cidade, estado
UserUpdate:        nome?, sobrenome?, email?, celular?, cep?, cidade?, estado?
UserResponse:      id, nome, sobrenome, email, cpf, celular, cep, cidade, estado, nivel, xp_total
UserStats:         total_entregas, kg_reciclado, nivel, xp_total, xp_proximo_nivel, progresso_pct
```

### Voucher
```
VoucherSaldo:         saldo_atual, nivel, nivel_bonus_pct, progresso_proximo_nivel
TransacaoResponse:    id, tipo, valor, descricao, created_at
UsarVoucherRequest:   parceiro_id, valor
```

### Coleta
```
PontoColetaResponse:   id, nome, endereco, lat, lng, distancia_km, status, materiais_aceitos
AgendamentoCreate:     ponto_id, horario, material_tipo
AgendamentoResponse:   id, ponto_id, horario, status, material_tipo, created_at
```

### Missão
```
MissaoResponse:     id, titulo, descricao, xp_recompensa, voucher_recompensa, meta_quantidade, tipo_material
ProgressoResponse:  missao, progresso_atual, percentual, concluida
```

### Parceiro
```
ParceiroResponse:   id, nome, categoria, descricao, beneficio, ativo
```

---

## API REST — Contratos

### Autenticação `/auth`

| Método | Rota | Body | Resposta | Auth |
|---|---|---|---|---|
| POST | `/auth/register` | UserCreate | UserResponse 201 | — |
| POST | `/auth/login` | LoginRequest | TokenResponse 200 | — |
| POST | `/auth/refresh` | RefreshRequest | `{access_token}` 200 | Refresh JWT |
| POST | `/auth/logout` | — | 204 | Bearer |

Erros: 400 email/CPF duplicado, 401 credenciais inválidas, 401 token expirado.

### Usuários `/users`

| Método | Rota | Resposta | Auth |
|---|---|---|---|
| GET | `/users/me` | UserResponse | Bearer |
| PUT | `/users/me` | UserResponse | Bearer |
| GET | `/users/me/stats` | UserStats | Bearer |

### VoucherVerde `/vouchers`

| Método | Rota | Body | Resposta | Auth |
|---|---|---|---|---|
| GET | `/vouchers/saldo` | — | VoucherSaldo | Bearer |
| GET | `/vouchers/historico` | — | `TransacaoResponse[]` | Bearer |
| POST | `/vouchers/usar` | UsarVoucherRequest | VoucherSaldo | Bearer |

Erros: 400 saldo insuficiente, 404 parceiro não encontrado.

### Coleta `/coleta`

| Método | Rota | Query | Resposta | Auth |
|---|---|---|---|---|
| GET | `/coleta/pontos` | `?material=` | `PontoColetaResponse[]` | Bearer |
| GET | `/coleta/pontos/{id}` | — | PontoColetaResponse | Bearer |
| POST | `/coleta/agendamentos` | — | AgendamentoResponse 201 | Bearer |
| GET | `/coleta/agendamentos` | — | `AgendamentoResponse[]` | Bearer |
| PUT | `/coleta/agendamentos/{id}` | `{status}` | AgendamentoResponse | Bearer |

Erros: 404 ponto/agendamento não encontrado, 403 agendamento de outro usuário.

### Missões `/missoes`

| Método | Rota | Resposta | Auth |
|---|---|---|---|
| GET | `/missoes` | `MissaoResponse[]` | Bearer |
| GET | `/missoes/ativas` | `ProgressoResponse[]` | Bearer |

### Parceiros `/parceiros`

| Método | Rota | Query | Resposta | Auth |
|---|---|---|---|---|
| GET | `/parceiros` | `?categoria=` | `ParceiroResponse[]` | Bearer |
| GET | `/parceiros/{id}` | — | ParceiroResponse | Bearer |

### Utilitários

| Método | Rota | Resposta | Auth |
|---|---|---|---|
| GET | `/health` | `{status, version}` | — |

---

## Camada de Segurança

### JWT
- **Access Token**: HS256, expira em 30 min, payload: `{sub: user_id, email, role}`
- **Refresh Token**: HS256, expira em 7 dias, armazenado com hash SHA-256 na tabela `refresh_tokens`
- Logout invalida o refresh token (marca `revoked=true`)
- `get_current_user()` dependency valida o access token e retorna o `User` do banco

### Senhas
- Hash com `passlib[bcrypt]`, custo 12
- Nunca retornadas em nenhum schema de resposta

### CORS
- Origens configuradas via `ALLOWED_ORIGINS` no `.env`
- `allow_credentials=True` para suporte a cookies futuros
- Todos os métodos e headers permitidos

---

## Camada de Repositories

### CRUDBase (genérico)
```python
class CRUDBase[ModelType, CreateSchema, UpdateSchema]:
    def get(db, id) -> ModelType | None
    def get_multi(db, skip, limit) -> list[ModelType]
    def create(db, obj_in) -> ModelType
    def update(db, db_obj, obj_in) -> ModelType
    def delete(db, id) -> ModelType
```

### Repositories especializados
- **UserRepository**: `get_by_email(email)`, `get_by_cpf(cpf)`
- **VoucherRepository**: `get_by_user(user_id)`, `add_transacao(voucher_id, tipo, valor, descricao)`
- **ColetaRepository**: `get_pontos_by_material(material)`, `get_agendamentos_by_user(user_id)`
- **MissaoRepository**: `get_ativas_by_user(user_id)`, `update_progresso(user_id, missao_id, delta)`

---

## Camada de Services

### AuthService
- `register(db, data: UserCreate) -> UserResponse` — valida unicidade, faz hash, cria User + VoucherVerde inicial
- `login(db, data: LoginRequest) -> TokenResponse` — verifica senha, gera access + refresh token
- `refresh_token(db, token: str) -> str` — valida refresh, gera novo access token
- `logout(db, token: str)` — revoga refresh token

### VoucherService
- `get_saldo(db, user_id) -> VoucherSaldo`
- `get_historico(db, user_id) -> list[TransacaoResponse]`
- `usar(db, user_id, parceiro_id, valor) -> VoucherSaldo` — debita com lock otimista
- `creditar(db, user_id, valor, descricao)` — chamado internamente após confirmação de coleta

### ColetaService
- `listar_pontos(db, material?) -> list[PontoColetaResponse]`
- `criar_agendamento(db, user_id, data: AgendamentoCreate) -> AgendamentoResponse`
- `atualizar_status(db, user_id, agendamento_id, status) -> AgendamentoResponse`

### MissaoService
- `get_ativas(db, user_id) -> list[ProgressoResponse]`
- `atualizar_progresso(db, user_id, tipo_material, quantidade)` — chamado após coleta confirmada
- `verificar_conclusao(db, user_id)` — credita recompensas de missões recém-concluídas

---

## Frontend — Cliente API (`api.js`)

Arquivo `frontend/public/api.js` centraliza todas as chamadas HTTP:

```javascript
const BASE_URL = 'http://localhost:8000';

const api = {
  // Armazena tokens no localStorage
  // Injeta Authorization: Bearer <token> em todas as rotas autenticadas
  // Redireciona para login em respostas 401

  login(email, senha),
  register(userData),
  logout(),
  getMe(),
  getStats(),
  updateMe(data),
  getSaldo(),
  getHistorico(),
  usarVoucher(parceiroId, valor),
  getPontos(material?),
  criarAgendamento(dados),
  getAgendamentos(),
  getMissoes(),
  getMissoesAtivas(),
  getParceiros(categoria?),
  getParceiro(id),
}
```

O `script.js` existente é adaptado progressivamente: as funções que usam `DEFAULT_POINTS`, `MISSION_DETAILS` e dados hardcoded passam a chamar `api.*` equivalentes.

---

## Tratamento de Erros

Todos os erros seguem o formato:
```json
{ "detail": "Mensagem descritiva" }
```

| Situação | HTTP |
|---|---|
| Validação Pydantic | 422 |
| Credenciais inválidas | 401 |
| Token expirado/inválido | 401 |
| Acesso negado | 403 |
| Recurso não encontrado | 404 |
| Regra de negócio violada | 400 |
| Conflito (email/CPF duplicado) | 409 |
| Erro interno | 500 (sem detalhes internos) |

---

## Variáveis de Ambiente (`.env.example`)

```env
# Banco de dados
DATABASE_URL=mysql+pymysql://root:senha@localhost:3306/ecodrop_db

# JWT
SECRET_KEY=chave-secreta-minimo-32-caracteres-aleatorios
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Ambiente
ENVIRONMENT=development
DEBUG=true

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

---

## Seed Data

Script `backend/app/seed/seed_data.py` popula:
- 5 `PontoColeta` em Manaus-AM com coordenadas reais
- 4 `Parceiro` (1 por categoria: supermercado, contas, alimentação, farmácia)
- 3 `Missao` ativas com metas e recompensas

Verifica existência antes de inserir (idempotente).

---

## Testes

- `tests/conftest.py`: fixture de banco SQLite em memória + `TestClient` do FastAPI
- `tests/test_auth.py`: registro, login, token inválido, CPF/email duplicado
- `tests/test_vouchers.py`: saldo inicial, crédito, débito, saldo insuficiente

Executar com: `pytest backend/tests/`

---

## Docker Compose (opcional)

```yaml
services:
  mysql:
    image: mysql:8.0
    environment: { MYSQL_DATABASE: ecodrop_db, ... }
    volumes: [mysql_data:/var/lib/mysql]
    ports: ["3306:3306"]

  backend:
    build: ./backend
    depends_on: [mysql]
    ports: ["8000:8000"]
    env_file: .env
```
