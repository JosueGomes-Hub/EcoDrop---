# EcoDrop v2 — Status das Tasks

> Gerado em: 2026-05-10

---

## ✅ Tasks Implementadas

### Fase 1 — Fundação do Backend

| Task | Descrição | Arquivos criados |
|------|-----------|-----------------|
| 1.1 | Estrutura de pastas e ambiente Python | `backend/app/` e subpastas, `backend/requirements.txt`, `backend/.venv/` |
| 1.2 | Variáveis de ambiente e configuração | `backend/app/config.py`, `.env.example`, `.gitignore` |
| 1.3 | Conexão com banco de dados | `backend/app/database.py` |
| 1.4 | Modelos SQLAlchemy | `models/base.py`, `user.py`, `voucher.py`, `coleta.py`, `missao.py`, `parceiro.py`, `refresh_token.py`, `__init__.py` |
| 1.5 | Configuração do Alembic | `backend/migrations/env.py`, `backend/alembic.ini` |
| 1.6 | Aplicação FastAPI base | `backend/app/main.py`, `core/exceptions.py` |

**Observação 1.5:** A migration inicial (`alembic revision --autogenerate`) e `alembic upgrade head` precisam ser executados com o banco MySQL disponível.

---

### Fase 2 — Autenticação e Usuários

| Task | Descrição | Arquivos criados |
|------|-----------|-----------------|
| 2.1 | Segurança: bcrypt e JWT | `core/security.py` |
| 2.2 | Schemas de autenticação e usuário | `schemas/auth.py`, `schemas/user.py` |
| 2.3 | Repository de usuário | `repositories/base.py`, `repositories/user_repo.py` |
| 2.4 | AuthService | `services/auth_service.py` |
| 2.5 | Dependency `get_current_user` | `core/dependencies.py` |
| 2.6 | Routers de autenticação e usuários | `routers/auth.py`, `routers/users.py` |

---

### Fase 3 — Features de Negócio

| Task | Descrição | Arquivos criados |
|------|-----------|-----------------|
| 3.1 | Repository e Service de VoucherVerde | `repositories/voucher_repo.py`, `services/voucher_service.py`, `schemas/voucher.py` |
| 3.2 | Router de VoucherVerde | `routers/vouchers.py` |
| 3.3 | Repository e Service de Coleta | `repositories/coleta_repo.py`, `services/coleta_service.py`, `schemas/coleta.py` |
| 3.4 | Router de Coleta | `routers/coletas.py` |
| 3.5 | Service e Router de Missões | `services/missao_service.py`, `routers/missoes.py`, `schemas/missao.py` |
| 3.6 | Router de Parceiros | `routers/parceiros.py`, `schemas/parceiro.py` |
| 3.7 | Seed data | `app/seed/seed_data.py` — 5 pontos de coleta em Manaus, 4 parceiros, 3 missões |

---

### Fase 4 — Frontend e Integração

| Task | Descrição | Arquivos criados/modificados |
|------|-----------|------------------------------|
| 4.1 | Servidor Node.js para o frontend | `frontend/server.js`, `frontend/package.json`; arquivos movidos para `frontend/public/` |
| 4.2 | Cliente API centralizado (`api.js`) | `frontend/public/api.js`; `<script src="api.js">` adicionado ao `index.html` |
| 4.3 | Integração: autenticação no frontend | `script.js` — `fazerLogin`, `fazerCadastro`, `fazerLogout`, `carregarSessao` adaptados |
| 4.4 | Integração: telas Home, Carteira e Perfil | `script.js` — `loadWalletData`, `loadMissionData`, `updateWallet`, `updateHome`, `renderTransactions`, `renderHomeMissions` adaptados |
| 4.5 | Integração: Mapa e Parceiros | `script.js` — `loadCollectionPoints`, `renderCollectionPoints`, `loadPartners`, `renderPartners`, `confirmarAgenda` adaptados |

---

### Fase 5 — Qualidade e Finalização

| Task | Descrição | Arquivos criados/modificados |
|------|-----------|------------------------------|
| 5.2 | Tratamento de erros padronizado | `core/exceptions.py` — handlers para 422, 401/HTTP e 500 |
| 5.3 | Documentação OpenAPI | `main.py` — tags, `license_info`, descrições por grupo de rotas |
| 5.4 | Docker Compose | `docker-compose.yml`, `backend/Dockerfile` |
| 5.5 | README atualizado | `README.md` — instruções completas da v2 |

---

## ❌ Tasks Não Executadas

### 5.1 — Testes unitários do backend

**Motivo:** Explicitamente excluída do escopo de execução.

**O que falta implementar:**
- `backend/tests/conftest.py` — fixture com banco SQLite em memória e `TestClient`
- `backend/tests/test_auth.py` — testes de registro, login, tokens e proteção de rotas
- `backend/tests/test_vouchers.py` — testes de saldo, crédito, débito e saldo insuficiente

**Comando para executar quando implementado:**
```bash
cd backend
source .venv/bin/activate
pytest tests/
```

---

## ⚠️ Pendências de Ambiente

As tasks abaixo foram implementadas mas dependem do banco MySQL para serem validadas em execução:

| Pendência | Comando |
|-----------|---------|
| Gerar migration inicial | `alembic revision --autogenerate -m "initial_schema"` |
| Aplicar migration | `alembic upgrade head` |
| Popular banco com dados iniciais | `python -m app.seed.seed_data` |
| Subir backend | `uvicorn app.main:app --reload --port 8000` |

---

## Resumo

| Fase | Total | Implementadas | Pendentes |
|------|-------|---------------|-----------|
| Fase 1 — Fundação | 6 | 6 | 0 |
| Fase 2 — Autenticação | 6 | 6 | 0 |
| Fase 3 — Negócio | 7 | 7 | 0 |
| Fase 4 — Frontend | 5 | 5 | 0 |
| Fase 5 — Qualidade | 5 | 4 | 1 (testes) |
| **Total** | **29** | **28** | **1** |
