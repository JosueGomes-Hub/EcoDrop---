# 📚 Stack Tecnológico - EcoDrop

> **Documento temporário** - Lista de bibliotecas e frameworks utilizados no projeto

---

## 🔧 **BACKEND** (Python/FastAPI)

### Framework e Servidor
- **FastAPI** `0.115.12` - Framework web moderno e rápido
- **Uvicorn** `0.30.1` - Servidor ASGI de alta performance

### Banco de Dados
- **SQLAlchemy** `2.0.41` - ORM para banco de dados
- **Alembic** `1.13.1` - Migrations de banco de dados
- **PyMySQL** `1.1.0` - Driver MySQL para Python

### Autenticação e Segurança
- **python-jose[cryptography]** `3.3.0` - Implementação JWT
- **Passlib[bcrypt]** `1.7.4` - Hashing de senhas
- **bcrypt** `4.0.1` - Algoritmo de criptografia
- **cryptography** `42.0.5` - Operações criptográficas

### Validação e Configuração
- **Pydantic** `2.11.4` - Validação de dados e schemas
- **Pydantic Settings** `2.9.1` - Gerenciamento de configurações
- **email-validator** `2.2.0` - Validação de emails

### Utilitários
- **python-dotenv** `1.0.1` - Variáveis de ambiente
- **python-multipart** `0.0.9` - Upload de arquivos

### Testes
- **pytest** `8.2.0` - Framework de testes
- **httpx** `0.27.0` - Cliente HTTP assíncrono
- **pytest-asyncio** `0.23.6` - Suporte async para pytest

---

## 🎨 **FRONTEND**

### Servidor
- **Express** `4.18.2` (Node.js) - Servidor de arquivos estáticos
- **nodemon** `3.0.1` (dev) - Auto-reload durante desenvolvimento

### Client-Side
- **HTML5** - Estrutura semântica
- **CSS3 Vanilla** - Estilização customizada (sem frameworks)
- **JavaScript Vanilla** - Lógica client-side (sem frameworks)
- **Google Fonts** - Tipografia (Sora e Playfair Display)

---

## 🗄️ **BANCO DE DADOS**
- **MySQL** `8.0` - Sistema de gerenciamento de banco de dados relacional

---

## 🐳 **INFRAESTRUTURA**
- **Docker** - Containerização
- **Docker Compose** - Orquestração de containers
- **Python** `3.12-slim` - Runtime do backend

---

## 📊 **Resumo por Camada**

| Camada | Tecnologia Principal |
|--------|---------------------|
| **Backend** | Python 3.12 + FastAPI + Uvicorn |
| **Frontend** | Node.js (Express) servindo HTML/CSS/JS Vanilla |
| **Banco de Dados** | MySQL 8.0 + SQLAlchemy |
| **Autenticação** | JWT (python-jose) + bcrypt |
| **Testes** | pytest + httpx |
| **Deploy** | Docker + Docker Compose |

---

## ⚠️ **Notas Importantes**

- **Código Legado:** Os arquivos Node.js no diretório `backend/` (`app.js`, `server.js`, controllers, routes) são código legado e **NÃO estão sendo utilizados**
- **Backend Atual:** O servidor backend roda 100% em Python/FastAPI
- **Frontend:** Usa Express apenas como servidor de arquivos estáticos, sem frameworks JavaScript (React, Vue, Angular)
- **Arquitetura:** API REST com FastAPI + Frontend SPA em Vanilla JS

---

**Gerado em:** 16/05/2026
