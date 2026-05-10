# EcoDrop — Plano de Refatoração Completa & Arquitetura Técnica v2.0
> **Recicle . Ganhe . Preserve** | Maio 2026

---

| Campo | Valor |
|---|---|
| **Projeto** | EcoDrop — App de Coleta Seletiva com VoucherVerde |
| **Versão Atual** | 1.0.0 — HTML/CSS/JS + Node.js (LiveServer) |
| **Versão Alvo** | 2.0.0 — FastAPI (Uvicorn) + Node.js Frontend Server |
| **Backend** | Python · FastAPI · Uvicorn · SQLAlchemy · Alembic · MySQL |
| **Frontend** | HTML5 · CSS3 · JavaScript Vanilla · Node.js (Express) |
| **Banco de Dados** | MySQL com Alembic para migrations |
| **Responsável** | Juender — Feira de Ciências e Tecnologia da Informação |

---

## Sumário

1. [Contexto e Objetivos da Refatoração](#1-contexto-e-objetivos)
2. [Nova Arquitetura do Sistema](#2-nova-arquitetura)
3. [Nova Estrutura de Pastas](#3-estrutura-de-pastas)
4. [Modelos de Banco de Dados — SQLAlchemy](#4-modelos-de-banco-de-dados)
5. [API REST — Endpoints FastAPI](#5-api-rest--endpoints)
6. [Alembic — Migrations do Banco de Dados](#6-alembic--migrations)
7. [Frontend Server — Node.js (Sem LiveServer)](#7-frontend-server--nodejs)
8. [Dependências e Instalação](#8-dependências-e-instalação)
9. [Plano de Execução — Fases e Prioridades](#9-plano-de-execução--fases)
10. [Features Futuras (Pós-Refatoração)](#10-features-futuras)

---

## 1. Contexto e Objetivos

### 1.1 O Projeto EcoDrop

O **EcoDrop** é um aplicativo mobile de coleta seletiva com gamificação desenvolvido como projeto acadêmico para a **Feira de Ciências e Tecnologia da Informação**. A plataforma conecta cidadãos da região amazônica a pontos de coleta de recicláveis, recompensando-os com **VoucherVerde** — uma moeda digital utilizável em estabelecimentos parceiros.

O sistema atual é composto por um frontend SPA (HTML/CSS/JS Vanilla) servido via extensão LiveServer do VS Code, e um backend Node.js rudimentar sem estrutura consolidada de banco de dados ou migrations.

**Funcionalidades existentes no frontend:**
- Splash Screen com animações CSS (keyframe `breathe`)
- Login e Cadastro com validações e máscaras (CPF, Celular, CEP)
- Home: saldo VoucherVerde, estatísticas e missões ativas com barra de progresso
- Mapa de Pontos de Coleta com pins e filtros por tipo de material
- Carteira VoucherVerde: histórico de transações e sistema de níveis
- Rede de Parceiros: 4 categorias (Supermercados, Contas, Alimentação, Farmácias)
- Perfil do usuário com dados do cadastro

---

### 1.2 Problemas da Versão Atual

| Problema | Impacto | Prioridade |
|---|---|---|
| Backend Node.js sem estrutura | Sem padrão de API, difícil manutenção | **Alta** |
| LiveServer como servidor frontend | Dependência de IDE, não escalável | **Alta** |
| Sem banco de dados real | Dados em memória, sem persistência | **Alta** |
| Sem sistema de migrations | Mudanças no schema são manuais e arriscadas | **Alta** |
| Modelos de dados espalhados | Inconsistência e duplicação de código | **Média** |
| Autenticação fake (sem JWT) | Sem segurança real nas rotas | **Alta** |
| Mapa com dados fictícios | Não reflete pontos de coleta reais | **Média** |
| Sem separação de ambientes | Dev e prod com mesmas configs | **Média** |

---

### 1.3 Objetivos da Refatoração v2.0

- Centralizar o backend em **Python com FastAPI + Uvicorn** — servidor ASGI de alta performance
- Usar **SQLAlchemy** como ORM centralizado com suporte a MySQL
- Implementar **Alembic** para controle versionado de migrations do banco de dados
- Substituir o LiveServer pelo **Node.js como servidor HTTP estático** do frontend
- Implementar autenticação real com **JWT (JSON Web Tokens)**
- Estruturar o projeto com separação clara de responsabilidades (camadas)
- Preparar a base para futuras features: mapa real, notificações, ranking

---

## 2. Nova Arquitetura

### 2.1 Visão Geral da Stack

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Backend API | Python · FastAPI · Uvicorn | API REST, lógica de negócio, autenticação |
| ORM / Modelos | SQLAlchemy 2.x | Mapeamento objeto-relacional, modelos centralizados |
| Migrations | Alembic | Versionamento e evolução do schema do banco |
| Banco de Dados | MySQL 8.x | Persistência de dados relacional |
| Frontend Server | Node.js · Express | Serve os arquivos estáticos HTML/CSS/JS |
| Frontend App | HTML5 · CSS3 · JS Vanilla | SPA existente refatorada para consumir a API |
| Autenticação | JWT · python-jose · passlib | Tokens de acesso e refresh, hash de senhas |
| Variáveis de Amb. | python-dotenv · .env | Configurações por ambiente (dev/prod) |

---

### 2.2 Fluxo de Comunicação

```
┌──────────────────────────────────────────────────────────┐
│  NAVEGADOR DO USUÁRIO                                    │
│  HTML + CSS + JavaScript (SPA)                           │
└──────────────┬───────────────────────────────────────────┘
               │ HTTP fetch() / axios
               │
┌──────────────▼───────────────────────────────────────────┐
│  NODE.JS FRONTEND SERVER  (porta 3000)                   │
│  express.static                                          │
│  Serve index.html, style.css, script.js, api.js          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  FASTAPI + UVICORN  (porta 8000)                         │
│  Routers → Services → Repositories → SQLAlchemy          │
│  Autenticação JWT · Validação Pydantic · CORS            │
└──────────────┬───────────────────────────────────────────┘
               │ SQLAlchemy ORM (PyMySQL)
               │
┌──────────────▼───────────────────────────────────────────┐
│  MYSQL 8.x  (porta 3306)                                 │
│  Migrations gerenciadas pelo Alembic                     │
└──────────────────────────────────────────────────────────┘
```

---

### 2.3 Decisões Arquiteturais

| Decisão | Justificativa |
|---|---|
| **FastAPI** sobre Flask/Django | Tipagem nativa, validação automática via Pydantic, suporte async, OpenAPI embutido, performance superior com Uvicorn/ASGI |
| **SQLAlchemy** sobre Tortoise-ORM | Maior maturidade, suporte completo a MySQL, integração nativa com Alembic, ampla documentação e comunidade |
| **Alembic** para migrations | Ferramenta oficial do ecossistema SQLAlchemy, controle de versão do schema, autogenerate de migrations, rollback seguro |
| **MySQL** como banco de dados | Banco relacional robusto, amplamente utilizado, excelente suporte a transações e integridade referencial |
| **Node.js** para frontend server | Elimina dependência do LiveServer/VS Code, serve produção e desenvolvimento, hot-reload com nodemon |
| **JWT** para autenticação | Stateless, escalável, padrão da indústria, suporte a refresh tokens, compatível com mobile futuro |

---

## 3. Estrutura de Pastas

```
ecodrop/
├── .env                            # ★ Variáveis de ambiente — raiz do projeto (único .env)
├── .env.example                    # Template do .env para versionamento no git
├── .gitignore                      # Inclui: .env, backend/.venv/, node_modules/
├── docker-compose.yml              # Orquestração local (MySQL + backend)
├── README.md
│
├── backend/                        # API Python (FastAPI)
│   ├── .venv/                      # ★ Ambiente virtual Python — dentro de backend/ (não versionado)
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # Ponto de entrada FastAPI + configuração CORS
│   │   ├── config.py               # Lê o .env da raiz via pydantic-settings
│   │   ├── database.py             # Engine e SessionLocal (SQLAlchemy)
│   │   │
│   │   ├── models/                 # ★ Todos os modelos SQLAlchemy centralizados
│   │   │   ├── __init__.py         # Exporta todos os modelos (import único para Alembic)
│   │   │   ├── base.py             # Base declarativa (DeclarativeBase) + TimestampMixin
│   │   │   ├── user.py             # Modelo User
│   │   │   ├── voucher.py          # Modelos VoucherVerde e Transacao
│   │   │   ├── coleta.py           # Modelos PontoColeta e Agendamento
│   │   │   ├── missao.py           # Modelo Missao e ProgressoMissao
│   │   │   └── parceiro.py         # Modelo Parceiro
│   │   │
│   │   ├── schemas/                # Schemas Pydantic (request/response)
│   │   │   ├── __init__.py
│   │   │   ├── user.py             # UserCreate, UserResponse, UserUpdate
│   │   │   ├── auth.py             # LoginRequest, TokenResponse, RefreshRequest
│   │   │   ├── voucher.py          # VoucherSaldo, TransacaoResponse, UsarVoucherRequest
│   │   │   ├── coleta.py           # PontoColetaResponse, AgendamentoCreate, AgendamentoResponse
│   │   │   ├── missao.py           # MissaoResponse, ProgressoResponse
│   │   │   └── parceiro.py         # ParceiroResponse
│   │   │
│   │   ├── routers/                # Endpoints FastAPI (APIRouter)
│   │   │   ├── __init__.py
│   │   │   ├── auth.py             # POST /auth/register, /auth/login, /auth/refresh
│   │   │   ├── users.py            # GET/PUT /users/me, GET /users/me/stats
│   │   │   ├── vouchers.py         # GET /vouchers/saldo, /historico; POST /usar, /creditar
│   │   │   ├── coletas.py          # GET /coleta/pontos; POST/GET /coleta/agendamentos
│   │   │   ├── missoes.py          # GET /missoes, /missoes/ativas
│   │   │   └── parceiros.py        # GET /parceiros, /parceiros/{id}
│   │   │
│   │   ├── services/               # Lógica de negócio (sem acesso direto ao DB)
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py     # register(), login(), refresh_token(), logout()
│   │   │   ├── voucher_service.py  # get_saldo(), get_historico(), usar(), creditar()
│   │   │   ├── coleta_service.py   # listar_pontos(), criar_agendamento()
│   │   │   └── missao_service.py   # get_ativas(), atualizar_progresso()
│   │   │
│   │   ├── repositories/           # Acesso ao banco (padrão Repository)
│   │   │   ├── __init__.py
│   │   │   ├── base.py             # CRUDBase genérico (get, get_multi, create, update, delete)
│   │   │   ├── user_repo.py        # get_by_email(), get_by_cpf()
│   │   │   ├── voucher_repo.py     # get_by_user(), add_transacao()
│   │   │   └── coleta_repo.py      # get_pontos_by_material(), get_agendamentos_by_user()
│   │   │
│   │   ├── core/                   # Utilitários do core
│   │   │   ├── __init__.py
│   │   │   ├── security.py         # JWT (python-jose), hash de senha (passlib/bcrypt)
│   │   │   ├── dependencies.py     # get_db(), get_current_user(), get_current_active_user()
│   │   │   └── exceptions.py       # Handlers de erro customizados (HTTP 400, 401, 404, 422)
│   │   │
│   │   └── seed/                   # Dados iniciais para desenvolvimento
│   │       ├── __init__.py
│   │       └── seed_data.py        # Pontos de coleta e parceiros de Manaus-AM
│   │
│   ├── migrations/                 # ★ Alembic migrations
│   │   ├── env.py                  # Configuração do Alembic (importa Base + todos os modelos)
│   │   ├── script.py.mako          # Template de migration
│   │   └── versions/               # Arquivos de migration versionados
│   │       └── 0001_initial_schema.py
│   │
│   ├── tests/                      # Testes do backend
│   │   ├── conftest.py             # Fixtures: DB de teste, cliente HTTP
│   │   ├── test_auth.py            # Testes de registro e login
│   │   └── test_vouchers.py        # Testes de saldo e transações
│   │
│   ├── alembic.ini                 # Config do Alembic
│   └── requirements.txt            # Dependências Python
│
├── frontend/                       # ★ Servidor Node.js + assets
│   ├── server.js                   # Servidor HTTP Express (substitui LiveServer)
│   ├── package.json
│   └── public/                     # Assets estáticos (mesmos arquivos atuais)
│       ├── index.html
│       ├── style.css
│       ├── script.js               # Adaptado para usar api.js
│       ├── api.js                  # ★ Novo: cliente centralizado fetch() para a API
│       └── assets/
│           └── icons/
```

---

## 4. Modelos de Banco de Dados — SQLAlchemy

### 4.1 Estratégia de Centralização

Todos os modelos ficam em `backend/app/models/` com uma **Base declarativa única** compartilhada. O `__init__.py` importa todos os modelos explicitamente para que o Alembic os detecte no `autogenerate`.

**Princípios:**
- Uma única `Base` declarativa em `base.py` — todos os modelos herdam dela
- `__init__.py` importa todos os modelos explicitamente (necessário para Alembic)
- Campos `created_at` e `updated_at` em todos os modelos via `TimestampMixin` reutilizável
- Relacionamentos definidos com `back_populates` para integridade bidirecional
- Constraints de banco declaradas nos modelos (`UniqueConstraint`, `Index`)

### 4.2 Exemplo: `backend/app/models/base.py`

```python
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )
```

### 4.3 Exemplo: `backend/app/models/user.py`

```python
from sqlalchemy import String, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin

class User(Base, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_user_email"),
        UniqueConstraint("cpf",   name="uq_user_cpf"),
    )

    id:         Mapped[int]  = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome:       Mapped[str]  = mapped_column(String(100), nullable=False)
    sobrenome:  Mapped[str]  = mapped_column(String(100), nullable=False)
    email:      Mapped[str]  = mapped_column(String(255), nullable=False)
    cpf:        Mapped[str]  = mapped_column(String(14),  nullable=False)
    celular:    Mapped[str]  = mapped_column(String(15),  nullable=True)
    cep:        Mapped[str]  = mapped_column(String(9),   nullable=True)
    cidade:     Mapped[str]  = mapped_column(String(100), nullable=True)
    estado:     Mapped[str]  = mapped_column(String(2),   nullable=True)
    senha_hash: Mapped[str]  = mapped_column(String(255), nullable=False)
    nivel:      Mapped[int]  = mapped_column(Integer, default=1)
    xp_total:   Mapped[int]  = mapped_column(Integer, default=0)

    # Relacionamentos
    voucher:      Mapped["VoucherVerde"]        = relationship(back_populates="user", uselist=False)
    agendamentos: Mapped[list["Agendamento"]]   = relationship(back_populates="user")
    progressos:   Mapped[list["ProgressoMissao"]] = relationship(back_populates="user")
```

### 4.4 Tabelas e Relacionamentos

| Tabela | Modelo Python | Campos Principais | Relacionamentos |
|---|---|---|---|
| `users` | `User` | id, nome, sobrenome, email, cpf, celular, cep, cidade, estado, senha_hash, nivel, xp_total | 1:1 Voucher, 1:N Agendamentos, 1:N ProgressoMissao |
| `vouchers` | `VoucherVerde` | id, user_id, saldo_atual, nivel_bonus_pct | 1:N Transacoes, N:1 User |
| `transacoes` | `Transacao` | id, voucher_id, tipo (entrada/saida), valor, descricao, created_at | N:1 Voucher |
| `pontos_coleta` | `PontoColeta` | id, nome, endereco, lat, lng, distancia_km, status, materiais_aceitos (JSON) | 1:N Agendamentos |
| `agendamentos` | `Agendamento` | id, user_id, ponto_id, horario, status, material_tipo | N:1 User, N:1 PontoColeta |
| `missoes` | `Missao` | id, titulo, descricao, xp_recompensa, voucher_recompensa, meta_quantidade, tipo_material | 1:N ProgressoMissao |
| `progresso_missao` | `ProgressoMissao` | id, user_id, missao_id, progresso_atual, concluida | N:1 User, N:1 Missao |
| `parceiros` | `Parceiro` | id, nome, categoria, descricao, beneficio, ativo | standalone |

### 4.5 `backend/app/models/__init__.py` (crítico para Alembic)

```python
# Importar todos os modelos aqui para que o Alembic os detecte no autogenerate
from .base import Base, TimestampMixin
from .user import User
from .voucher import VoucherVerde, Transacao
from .coleta import PontoColeta, Agendamento
from .missao import Missao, ProgressoMissao
from .parceiro import Parceiro

__all__ = [
    "Base", "TimestampMixin",
    "User",
    "VoucherVerde", "Transacao",
    "PontoColeta", "Agendamento",
    "Missao", "ProgressoMissao",
    "Parceiro",
]
```

---

## 5. API REST — Endpoints

### 5.1 Autenticação (`/auth`)

| Método | Endpoint | Descrição | Auth? |
|---|---|---|---|
| `POST` | `/auth/register` | Registra novo usuário (hash de senha com bcrypt) | Não |
| `POST` | `/auth/login` | Autentica e retorna `access_token` + `refresh_token` (JWT) | Não |
| `POST` | `/auth/refresh` | Gera novo `access_token` a partir do `refresh_token` válido | Refresh JWT |
| `POST` | `/auth/logout` | Invalida o `refresh_token` (blacklist em DB) | Sim |

### 5.2 Usuários (`/users`)

| Método | Endpoint | Descrição | Auth? |
|---|---|---|---|
| `GET` | `/users/me` | Retorna perfil completo do usuário autenticado | Sim |
| `PUT` | `/users/me` | Atualiza dados do perfil (nome, cidade, celular) | Sim |
| `GET` | `/users/me/stats` | Retorna estatísticas: entregas, kg reciclado, nível, XP | Sim |

### 5.3 Vouchers (`/vouchers`)

| Método | Endpoint | Descrição | Auth? |
|---|---|---|---|
| `GET` | `/vouchers/saldo` | Retorna saldo atual, nível e % para próximo nível | Sim |
| `GET` | `/vouchers/historico` | Lista transações paginadas (entrada/saída) | Sim |
| `POST` | `/vouchers/usar` | Debita vouchers em parceiro (gera transação de saída) | Sim |
| `POST` | `/vouchers/creditar` | Credita vouchers após confirmação de coleta (webhook) | Sim |

### 5.4 Coleta (`/coleta`)

| Método | Endpoint | Descrição | Auth? |
|---|---|---|---|
| `GET` | `/coleta/pontos` | Lista pontos de coleta com filtro por material e status | Sim |
| `GET` | `/coleta/pontos/{id}` | Detalhe de um ponto de coleta específico | Sim |
| `POST` | `/coleta/agendamentos` | Cria agendamento (ponto, horário, tipo de material) | Sim |
| `GET` | `/coleta/agendamentos` | Lista agendamentos do usuário (histórico) | Sim |
| `PUT` | `/coleta/agendamentos/{id}` | Atualiza status do agendamento (cancelar, confirmar) | Sim |

### 5.5 Missões e Parceiros

| Método | Endpoint | Descrição | Auth? |
|---|---|---|---|
| `GET` | `/missoes` | Lista todas as missões disponíveis | Sim |
| `GET` | `/missoes/ativas` | Missões em progresso do usuário com % de conclusão | Sim |
| `GET` | `/parceiros` | Lista parceiros ativos por categoria | Sim |
| `GET` | `/parceiros/{id}` | Detalhe de um parceiro específico | Sim |

### 5.6 Exemplo de Implementação — `backend/app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, users, vouchers, coletas, missoes, parceiros

app = FastAPI(
    title="EcoDrop API",
    description="API do sistema EcoDrop — Coleta Seletiva com VoucherVerde",
    version="2.0.0",
)

# Configurar CORS para aceitar o frontend Node.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(auth.router,      prefix="/auth",      tags=["Autenticação"])
app.include_router(users.router,     prefix="/users",     tags=["Usuários"])
app.include_router(vouchers.router,  prefix="/vouchers",  tags=["VoucherVerde"])
app.include_router(coletas.router,   prefix="/coleta",    tags=["Coleta"])
app.include_router(missoes.router,   prefix="/missoes",   tags=["Missões"])
app.include_router(parceiros.router, prefix="/parceiros", tags=["Parceiros"])

@app.get("/health")
def health_check():
    return {"status": "ok", "app": "EcoDrop", "version": "2.0.0"}
```

---

## 6. Alembic — Migrations

### 6.1 Configuração do `env.py`

```python
# backend/migrations/env.py
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# ★ Importar Base e TODOS os modelos (necessário para autogenerate)
from app.models import Base
from app.models import User, VoucherVerde, Transacao, PontoColeta
from app.models import Agendamento, Missao, ProgressoMissao, Parceiro
from app.config import settings

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

target_metadata = Base.metadata
```

### 6.2 Comandos Essenciais

```bash
# Inicializar Alembic (só na primeira vez)
cd backend/
alembic init migrations

# Gerar nova migration automaticamente a partir dos modelos
alembic revision --autogenerate -m "add_coluna_status_agendamento"

# Aplicar todas as migrations pendentes
alembic upgrade head

# Ver status atual das migrations
alembic current

# Ver histórico de migrations
alembic history --verbose

# Reverter última migration
alembic downgrade -1

# Reverter para migration específica
alembic downgrade 0001_initial_schema
```

### 6.3 Fluxo de Trabalho

```
Modificar modelo Python em models/
         ↓
alembic revision --autogenerate -m "descricao"
         ↓
Revisar o arquivo gerado em migrations/versions/
         ↓
alembic upgrade head
         ↓
Validar schema no MySQL (SHOW TABLES; DESCRIBE tabela;)
```

---

## 7. Frontend Server — Node.js

### 7.1 `frontend/server.js`

```javascript
const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// Serve os arquivos estáticos da pasta public/
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback: qualquer rota retorna index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`EcoDrop Frontend: http://localhost:${PORT}`);
  console.log(`Backend API:      http://localhost:8000`);
  console.log(`API Docs:         http://localhost:8000/docs`);
});
```

### 7.2 `frontend/package.json`

```json
{
  "name": "ecodrop-frontend",
  "version": "2.0.0",
  "description": "EcoDrop — Frontend Server (substitui LiveServer)",
  "scripts": {
    "start": "node server.js",
    "dev":   "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### 7.3 `frontend/public/api.js` — Cliente Centralizado da API

```javascript
// frontend/public/api.js
// Substitui os dados em memória (objetos PONTOS, MISSOES) do script.js atual

const BASE_URL = 'http://localhost:8000';

const api = {
  _getToken() {
    return localStorage.getItem('access_token');
  },

  _headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this._getToken()}`,
    };
  },

  // ── Autenticação ──────────────────────────────────────────
  async login(email, senha) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('access_token',  data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return { ok: res.ok, data };
  },

  async register(userData) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return { ok: res.ok, data: await res.json() };
  },

  async logout() {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST', headers: this._headers(),
    });
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  // ── Usuário ───────────────────────────────────────────────
  async getMe()    { return (await fetch(`${BASE_URL}/users/me`,       { headers: this._headers() })).json(); },
  async getStats() { return (await fetch(`${BASE_URL}/users/me/stats`, { headers: this._headers() })).json(); },

  // ── VoucherVerde ──────────────────────────────────────────
  async getSaldo()     { return (await fetch(`${BASE_URL}/vouchers/saldo`,    { headers: this._headers() })).json(); },
  async getHistorico() { return (await fetch(`${BASE_URL}/vouchers/historico`,{ headers: this._headers() })).json(); },

  // ── Coleta ────────────────────────────────────────────────
  async getPontos(material = '') {
    const q = material ? `?material=${material}` : '';
    return (await fetch(`${BASE_URL}/coleta/pontos${q}`, { headers: this._headers() })).json();
  },
  async criarAgendamento(dados) {
    const res = await fetch(`${BASE_URL}/coleta/agendamentos`, {
      method: 'POST', headers: this._headers(), body: JSON.stringify(dados),
    });
    return { ok: res.ok, data: await res.json() };
  },

  // ── Missões e Parceiros ───────────────────────────────────
  async getMissoesAtivas() { return (await fetch(`${BASE_URL}/missoes/ativas`, { headers: this._headers() })).json(); },
  async getParceiros()     { return (await fetch(`${BASE_URL}/parceiros`,       { headers: this._headers() })).json(); },
};
```

### 7.4 Adaptação do `script.js` Existente

O `script.js` atual usa dados hardcoded em objetos. A adaptação é progressiva:

```javascript
// ANTES (v1 — dados em memória)
const PONTOS = [
  { id: 1, nome: 'EcoPonto Central', ... },
];
function renderPontos() { /* usa PONTOS */ }

// DEPOIS (v2 — dados da API)
async function renderPontos(materialFiltro = '') {
  const pontos = await api.getPontos(materialFiltro);
  // mesma lógica de render, mas com dados reais
}

// ANTES — login fake
function fazerLogin() {
  if (email && senha) { goTo('home'); }
}

// DEPOIS — login real com JWT
async function fazerLogin() {
  const email = document.getElementById('login-email').value;
  const senha = document.getElementById('login-senha').value;
  const result = await api.login(email, senha);
  if (result.ok) {
    await updateUI();
    goTo('home');
    showToast('Bem-vindo ao EcoDrop!');
  } else {
    showToast('E-mail ou senha inválidos', 'erro');
  }
}
```

---

## 8. Dependências e Instalação

### 8.1 `backend/requirements.txt`

```txt
# Framework e servidor
fastapi==0.111.0
uvicorn[standard]==0.30.1

# ORM e banco de dados
sqlalchemy==2.0.30
alembic==1.13.1
pymysql==1.1.0            # Driver MySQL para SQLAlchemy
cryptography==42.0.5      # Dependência do pymysql

# Validação e serialização
pydantic==2.7.1
pydantic-settings==2.2.1

# Autenticação
python-jose[cryptography]==3.3.0   # JWT
passlib[bcrypt]==1.7.4             # Hash de senhas

# Utilitários
python-dotenv==1.0.1
python-multipart==0.0.9    # Form data (upload de arquivos)

# Testes
pytest==8.2.0
httpx==0.27.0              # Cliente HTTP assíncrono para testes FastAPI
pytest-asyncio==0.23.6
```

### 8.2 `.env.example` (raiz do projeto)

> O arquivo `.env` fica na **raiz do projeto** e é lido pelo backend via `pydantic-settings`
> com `env_file = "../.env"` (um nível acima de `backend/`). Nunca commitar o `.env` real.

```env
# ── Banco de Dados MySQL ───────────────────────────────────────
DATABASE_URL=mysql+pymysql://root:senha@localhost:3306/ecodrop_db

# ── JWT ───────────────────────────────────────────────────────
SECRET_KEY=sua-chave-secreta-muito-longa-e-aleatoria-aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# ── Ambiente ──────────────────────────────────────────────────
ENVIRONMENT=development
DEBUG=true

# ── CORS — origens permitidas para o frontend Node.js ─────────
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

O `config.py` do backend aponta para a raiz do projeto:

```python
# backend/app/config.py
from pydantic_settings import BaseSettings
from pathlib import Path

# Raiz do projeto = dois níveis acima de config.py (backend/app/config.py)
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

### 8.3 Instalação Passo a Passo

```bash
# ═══ CONFIGURAÇÃO INICIAL (raiz do projeto) ═══════════════════

# 1. Copiar o template e preencher com suas credenciais
cp .env.example .env
# Editar .env com DATABASE_URL, SECRET_KEY, etc.


# ═══ BACKEND ══════════════════════════════════════════════════

cd backend/

# 2. Criar o ambiente virtual DENTRO de backend/
python -m venv .venv

# 3. Ativar o ambiente virtual
source .venv/bin/activate          # Linux/Mac
# .venv\Scripts\activate           # Windows

# 4. Instalar dependências Python
pip install -r requirements.txt

# 5. Criar banco de dados no MySQL
mysql -u root -p -e "CREATE DATABASE ecodrop_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 6. Aplicar migrations (lê o .env da raiz automaticamente via config.py)
alembic upgrade head

# 7. Popular banco com dados iniciais (opcional)
python -m app.seed.seed_data

# 8. Iniciar servidor (desenvolvimento com hot-reload)
uvicorn app.main:app --reload --port 8000

# Documentação automática gerada pelo FastAPI:
# → Swagger UI:  http://localhost:8000/docs
# → ReDoc:       http://localhost:8000/redoc


# ═══ FRONTEND ═════════════════════════════════════════════════

cd ../frontend/

# 9. Instalar dependências Node.js
npm install

# 10. Desenvolvimento (hot-reload com nodemon)
npm run dev

# 11. Produção
npm start

# Acessar em: http://localhost:3000
```

---

## 9. Plano de Execução — Fases

### Fase 1 — Fundação do Backend (Semana 1–2)

**Objetivo:** Projeto Python funcional com banco de dados rodando.

- [ ] Criar estrutura de pastas do `backend/`
- [ ] Configurar FastAPI + Uvicorn + SQLAlchemy + MySQL
- [ ] Implementar `config.py` com pydantic-settings (leitura do `.env`)
- [ ] Implementar `database.py` (engine, SessionLocal, `get_db` dependency)
- [ ] Criar `models/base.py` com `Base` e `TimestampMixin`
- [ ] Criar todos os modelos SQLAlchemy em `backend/app/models/`
- [ ] Configurar `models/__init__.py` exportando todos os modelos
- [ ] Inicializar Alembic e configurar `migrations/env.py`
- [ ] Gerar e aplicar migration inicial (`0001_initial_schema`)
- [ ] Validar schema no MySQL (`SHOW TABLES;`)

---

### Fase 2 — Autenticação e Usuários (Semana 2–3)

**Objetivo:** Login real com JWT funcionando.

- [ ] Implementar `core/security.py`: hash de senha (bcrypt), criação e verificação de JWT
- [ ] Criar schemas Pydantic: `UserCreate`, `UserLogin`, `UserResponse`, `TokenResponse`
- [ ] Implementar `services/auth_service.py`: `register()`, `login()`, `refresh_token()`
- [ ] Implementar `repositories/user_repo.py`: `get_by_email()`, `get_by_cpf()`
- [ ] Criar `routers/auth.py` e `routers/users.py`
- [ ] Implementar dependency `get_current_user()` para proteção de rotas
- [ ] Testar endpoints com Swagger UI (`/docs`)
- [ ] Configurar CORS no `main.py`

---

### Fase 3 — Features de Negócio (Semana 3–4)

**Objetivo:** Todas as features do app com dados reais.

- [ ] Implementar `VoucherService`: `get_saldo()`, `get_historico()`, `creditar()`, `usar()`
- [ ] Implementar `ColetaService`: `listar_pontos()` (com filtros), `criar_agendamento()`
- [ ] Implementar `MissaoService`: `get_ativas()`, `atualizar_progresso()`
- [ ] Criar todos os routers: `vouchers`, `coletas`, `missoes`, `parceiros`
- [ ] Popular banco com dados seed (pontos de coleta e parceiros de Manaus-AM)
- [ ] Validar regras de negócio: saldo não negativo, cálculo de nível e XP
- [ ] Criar migration para novos campos se necessário

---

### Fase 4 — Frontend Server e Integração (Semana 4–5)

**Objetivo:** Frontend rodando sem LiveServer, consumindo a API real.

- [ ] Criar `frontend/server.js` com Express (substitui LiveServer)
- [ ] Configurar `frontend/package.json` com scripts `start` e `dev` (nodemon)
- [ ] Criar `frontend/public/api.js` com cliente centralizado `fetch()`
- [ ] Adaptar `fazerLogin()` e `fazerCadastro()` em `script.js` para usar `api.js`
- [ ] Adaptar tela Home para carregar stats reais da API
- [ ] Adaptar tela Carteira para carregar saldo e histórico reais
- [ ] Adaptar tela Mapa para carregar pontos de coleta do banco
- [ ] Adaptar tela Parceiros para carregar lista real
- [ ] Adaptar missões para mostrar progresso real do usuário
- [ ] Testar fluxo completo: login → home → agendamento → voucher

---

### Fase 5 — Qualidade e Finalização (Semana 5–6)

**Objetivo:** Projeto pronto para apresentação.

- [ ] Escrever testes unitários para `AuthService` e `VoucherService` (pytest)
- [ ] Testar endpoints com `httpx` no pytest
- [ ] Revisar e completar documentação automática (OpenAPI/Swagger)
- [ ] Implementar tratamento de erros padronizado (middleware de exceções)
- [ ] Criar `README.md` com instruções de instalação e execução
- [ ] Preparar `docker-compose.yml` para subir MySQL + backend juntos
- [ ] Preparar apresentação para a Feira de Ciências

---

## 10. Features Futuras

### 10.1 Roadmap do Projeto

| Feature | Descrição | Complexidade |
|---|---|---|
| **Mapa Real (Leaflet.js)** | Substituir mapa CSS fake por Leaflet.js com marcadores reais e coordenadas do banco | Média |
| **GPS do Usuário** | `navigator.geolocation` para calcular distância real aos pontos de coleta | Baixa |
| **QR Code de Confirmação** | Gerar QR Code no agendamento; atendente escaneia para confirmar e creditar voucher | Média |
| **Notificações Push** | Voucher creditado, missão concluída, lembretes via Web Push API | Alta |
| **Calculadora de Impacto** | CO₂ economizado e árvores equivalentes baseados no kg reciclado | Baixa |
| **Ranking por Cidade/Bairro** | Leaderboard de usuários com paginação | Média |
| **Missões Colaborativas** | Grupos de usuários somam progresso para missões coletivas | Alta |
| **Integração PIX** | Transferência do saldo VoucherVerde para conta bancária via API PIX (Bacen) | Alta |
| **Painel Administrativo** | Interface para pontos de coleta gerenciarem agendamentos e darem baixa | Alta |
| **App React Native** | Conversão para app nativo publicável nas lojas | Muito Alta |

---

## Referências Técnicas

| Documentação | URL |
|---|---|
| FastAPI | https://fastapi.tiangolo.com |
| SQLAlchemy 2.x | https://docs.sqlalchemy.org/en/20/ |
| Alembic | https://alembic.sqlalchemy.org/en/latest/ |
| PyMySQL | https://pymysql.readthedocs.io |
| python-jose (JWT) | https://python-jose.readthedocs.io |
| passlib (bcrypt) | https://passlib.readthedocs.io |
| Express.js | https://expressjs.com |
| Pydantic v2 | https://docs.pydantic.dev/latest/ |

---

> **EcoDrop v2.0** — FastAPI · SQLAlchemy · Alembic · MySQL · Node.js
>
> *Cada linha de código, um passo pela Amazônia.*
>
> Projeto desenvolvido por Juender | Feira de Ciências e Tecnologia da Informação | 2026
