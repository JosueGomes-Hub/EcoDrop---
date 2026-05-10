# Documento de Requisitos — EcoDrop v2.0 Refatoração

## Introduction

Este documento especifica os requisitos para a refatoração completa do sistema EcoDrop, migrando da arquitetura atual (HTML/CSS/JS + Node.js com LiveServer) para uma arquitetura robusta e escalável baseada em Python FastAPI + Node.js Express + MySQL.

O **EcoDrop** é um aplicativo de coleta seletiva com gamificação que conecta cidadãos da região amazônica a pontos de coleta de recicláveis, recompensando-os com **VoucherVerde** — uma moeda digital utilizável em estabelecimentos parceiros.

A refatoração visa resolver problemas críticos da versão atual: ausência de persistência de dados, autenticação fake, dependência de IDE para servir o frontend, e falta de estrutura de código escalável.

## Glossary

- **Sistema_Backend**: API REST desenvolvida em Python com FastAPI + Uvicorn
- **Sistema_Frontend**: Servidor HTTP Node.js com Express servindo arquivos estáticos
- **ORM**: SQLAlchemy 2.x — mapeador objeto-relacional para MySQL
- **Migration_System**: Alembic — sistema de versionamento de schema de banco de dados
- **Database**: MySQL 8.x — banco de dados relacional
- **JWT**: JSON Web Token — padrão de autenticação stateless
- **VoucherVerde**: Moeda digital do sistema EcoDrop
- **User**: Usuário cadastrado no sistema
- **PontoColeta**: Local físico que aceita materiais recicláveis
- **Agendamento**: Reserva de horário para entrega de materiais em um PontoColeta
- **Missao**: Desafio gamificado com recompensas de XP e VoucherVerde
- **Parceiro**: Estabelecimento comercial que aceita VoucherVerde como pagamento
- **Transacao**: Registro de entrada ou saída de VoucherVerde
- **Access_Token**: Token JWT de curta duração para autenticação de requisições
- **Refresh_Token**: Token JWT de longa duração para renovação de Access_Token
- **Base_Declarativa**: Classe base do SQLAlchemy da qual todos os modelos herdam
- **Repository**: Camada de acesso a dados que encapsula operações de banco
- **Service**: Camada de lógica de negócio que orquestra repositories
- **Router**: Camada de endpoints HTTP que expõe a API REST
- **Schema_Pydantic**: Modelo de validação e serialização de dados
- **CORS**: Cross-Origin Resource Sharing — política de segurança para requisições entre domínios
- **Seed_Data**: Dados iniciais para popular o banco em desenvolvimento

## Requirements

### Requisito 1: Estrutura de Projeto e Configuração

**User Story:** Como desenvolvedor, eu quero uma estrutura de projeto bem organizada com separação clara de responsabilidades, para que o código seja fácil de manter e escalar.

#### Acceptance Criteria

1. THE Sistema_Backend SHALL ter estrutura de pastas com camadas separadas: models, schemas, routers, services, repositories, core
2. THE Sistema_Backend SHALL ter ambiente virtual Python (.venv) dentro do diretório backend/
3. THE Sistema_Frontend SHALL ter estrutura com server.js e pasta public/ para assets estáticos
4. THE Sistema SHALL ter arquivo .env na raiz do projeto contendo todas as variáveis de ambiente
5. THE Sistema SHALL ter arquivo .env.example versionado no git como template
6. THE Sistema SHALL ter arquivo .gitignore que exclua .env, .venv/, e node_modules/
7. THE Base_Declarativa SHALL estar definida em models/base.py e ser única para todos os modelos
8. THE Sistema_Backend SHALL ter arquivo config.py que leia o .env da raiz usando pydantic-settings

### Requisito 2: Modelos de Dados SQLAlchemy

**User Story:** Como desenvolvedor, eu quero modelos de dados centralizados e bem estruturados, para que o Alembic possa gerar migrations automaticamente e o código seja consistente.

#### Acceptance Criteria

1. THE Sistema_Backend SHALL ter todos os modelos SQLAlchemy em backend/app/models/
2. THE Sistema_Backend SHALL ter TimestampMixin reutilizável com campos created_at e updated_at
3. THE Sistema_Backend SHALL ter modelo User com campos: id, nome, sobrenome, email, cpf, celular, cep, cidade, estado, senha_hash, nivel, xp_total
4. THE Sistema_Backend SHALL ter modelo VoucherVerde com campos: id, user_id, saldo_atual, nivel_bonus_pct
5. THE Sistema_Backend SHALL ter modelo Transacao com campos: id, voucher_id, tipo, valor, descricao
6. THE Sistema_Backend SHALL ter modelo PontoColeta com campos: id, nome, endereco, lat, lng, distancia_km, status, materiais_aceitos
7. THE Sistema_Backend SHALL ter modelo Agendamento com campos: id, user_id, ponto_id, horario, status, material_tipo
8. THE Sistema_Backend SHALL ter modelo Missao com campos: id, titulo, descricao, xp_recompensa, voucher_recompensa, meta_quantidade, tipo_material
9. THE Sistema_Backend SHALL ter modelo ProgressoMissao com campos: id, user_id, missao_id, progresso_atual, concluida
10. THE Sistema_Backend SHALL ter modelo Parceiro com campos: id, nome, categoria, descricao, beneficio, ativo
11. THE Sistema_Backend SHALL ter arquivo models/__init__.py que importe explicitamente todos os modelos
12. THE Sistema_Backend SHALL definir relacionamentos bidirecionais usando back_populates
13. THE Sistema_Backend SHALL definir constraints de unicidade para User.email e User.cpf

### Requisito 3: Sistema de Migrations com Alembic

**User Story:** Como desenvolvedor, eu quero um sistema de migrations versionado, para que mudanças no schema do banco sejam rastreáveis e reversíveis.

#### Acceptance Criteria

1. THE Migration_System SHALL estar configurado em backend/migrations/
2. THE Migration_System SHALL ter arquivo env.py que importe Base_Declarativa e todos os modelos
3. THE Migration_System SHALL ter arquivo alembic.ini na raiz de backend/
4. WHEN o desenvolvedor executa `alembic revision --autogenerate`, THE Migration_System SHALL gerar migration baseada nos modelos Python
5. WHEN o desenvolvedor executa `alembic upgrade head`, THE Migration_System SHALL aplicar todas as migrations pendentes no Database
6. WHEN o desenvolvedor executa `alembic downgrade -1`, THE Migration_System SHALL reverter a última migration aplicada
7. THE Migration_System SHALL armazenar migrations versionadas em migrations/versions/
8. THE Migration_System SHALL ler DATABASE_URL do arquivo config.py do Sistema_Backend

### Requisito 4: Configuração do Banco de Dados

**User Story:** Como desenvolvedor, eu quero conexão centralizada com o banco de dados, para que todas as operações usem a mesma configuração.

#### Acceptance Criteria

1. THE Sistema_Backend SHALL ter arquivo database.py com engine SQLAlchemy
2. THE Sistema_Backend SHALL ter SessionLocal configurado com autocommit=False e autoflush=False
3. THE Sistema_Backend SHALL ter função get_db() que retorne sessão de banco como dependency do FastAPI
4. THE Sistema_Backend SHALL usar PyMySQL como driver MySQL para SQLAlchemy
5. THE Database SHALL ser MySQL 8.x com charset utf8mb4 e collation utf8mb4_unicode_ci
6. THE Sistema_Backend SHALL ler DATABASE_URL do arquivo .env via config.py

### Requisito 5: Autenticação e Segurança

**User Story:** Como usuário, eu quero autenticação segura com JWT, para que minhas credenciais e dados estejam protegidos.

#### Acceptance Criteria

1. THE Sistema_Backend SHALL ter módulo core/security.py com funções de hash de senha usando bcrypt
2. THE Sistema_Backend SHALL ter funções de criação e validação de JWT usando python-jose
3. WHEN um User se registra, THE Sistema_Backend SHALL fazer hash da senha com bcrypt antes de armazenar
4. WHEN um User faz login com credenciais válidas, THE Sistema_Backend SHALL retornar Access_Token e Refresh_Token
5. THE Access_Token SHALL ter validade de 30 minutos
6. THE Refresh_Token SHALL ter validade de 7 dias
7. THE Sistema_Backend SHALL ter dependency get_current_user() que valide Access_Token e retorne User autenticado
8. WHEN um Access_Token expira, THE Sistema_Backend SHALL permitir renovação usando Refresh_Token válido
9. THE Sistema_Backend SHALL usar SECRET_KEY do arquivo .env para assinar tokens JWT
10. THE Sistema_Backend SHALL usar algoritmo HS256 para JWT

### Requisito 6: Schemas Pydantic

**User Story:** Como desenvolvedor, eu quero schemas de validação e serialização, para que os dados da API sejam sempre consistentes e validados.

#### Acceptance Criteria

1. THE Sistema_Backend SHALL ter schemas Pydantic em backend/app/schemas/
2. THE Sistema_Backend SHALL ter UserCreate schema com campos: nome, sobrenome, email, cpf, senha, celular, cep, cidade, estado
3. THE Sistema_Backend SHALL ter UserResponse schema que exclua senha_hash
4. THE Sistema_Backend SHALL ter LoginRequest schema com campos: email, senha
5. THE Sistema_Backend SHALL ter TokenResponse schema com campos: access_token, refresh_token, token_type
6. THE Sistema_Backend SHALL ter VoucherSaldo schema com campos: saldo_atual, nivel, nivel_bonus_pct, progresso_proximo_nivel
7. THE Sistema_Backend SHALL ter TransacaoResponse schema com campos: id, tipo, valor, descricao, created_at
8. THE Sistema_Backend SHALL ter PontoColetaResponse schema com todos os campos de PontoColeta
9. THE Sistema_Backend SHALL ter AgendamentoCreate schema com campos: ponto_id, horario, material_tipo
10. THE Sistema_Backend SHALL ter MissaoResponse schema com todos os campos de Missao
11. THE Sistema_Backend SHALL ter ParceiroResponse schema com todos os campos de Parceiro

### Requisito 7: Endpoints de Autenticação

**User Story:** Como usuário, eu quero me registrar e fazer login no sistema, para que eu possa acessar as funcionalidades protegidas.

#### Acceptance Criteria

1. WHEN um User envia POST /auth/register com dados válidos, THE Sistema_Backend SHALL criar novo User no Database e retornar UserResponse
2. WHEN um User envia POST /auth/register com email já cadastrado, THE Sistema_Backend SHALL retornar erro HTTP 400
3. WHEN um User envia POST /auth/register com CPF já cadastrado, THE Sistema_Backend SHALL retornar erro HTTP 400
4. WHEN um User envia POST /auth/login com credenciais válidas, THE Sistema_Backend SHALL retornar TokenResponse com Access_Token e Refresh_Token
5. WHEN um User envia POST /auth/login com credenciais inválidas, THE Sistema_Backend SHALL retornar erro HTTP 401
6. WHEN um User envia POST /auth/refresh com Refresh_Token válido, THE Sistema_Backend SHALL retornar novo Access_Token
7. WHEN um User envia POST /auth/refresh com Refresh_Token inválido ou expirado, THE Sistema_Backend SHALL retornar erro HTTP 401
8. WHEN um User autenticado envia POST /auth/logout, THE Sistema_Backend SHALL invalidar o Refresh_Token

### Requisito 8: Endpoints de Usuário

**User Story:** Como usuário autenticado, eu quero visualizar e atualizar meu perfil, para que eu possa manter meus dados atualizados.

#### Acceptance Criteria

1. WHEN um User autenticado envia GET /users/me, THE Sistema_Backend SHALL retornar UserResponse com dados completos do perfil
2. WHEN um User não autenticado envia GET /users/me, THE Sistema_Backend SHALL retornar erro HTTP 401
3. WHEN um User autenticado envia PUT /users/me com dados válidos, THE Sistema_Backend SHALL atualizar os campos permitidos e retornar UserResponse
4. WHEN um User autenticado envia GET /users/me/stats, THE Sistema_Backend SHALL retornar estatísticas: total_entregas, kg_reciclado, nivel, xp_total, xp_proximo_nivel

### Requisito 9: Endpoints de VoucherVerde

**User Story:** Como usuário autenticado, eu quero visualizar meu saldo e histórico de VoucherVerde, para que eu possa acompanhar minhas recompensas.

#### Acceptance Criteria

1. WHEN um User autenticado envia GET /vouchers/saldo, THE Sistema_Backend SHALL retornar VoucherSaldo com saldo_atual, nivel, nivel_bonus_pct e progresso_proximo_nivel
2. WHEN um User autenticado envia GET /vouchers/historico, THE Sistema_Backend SHALL retornar lista paginada de TransacaoResponse ordenada por data decrescente
3. WHEN um User autenticado envia POST /vouchers/usar com valor e parceiro_id válidos, THE Sistema_Backend SHALL debitar VoucherVerde e criar Transacao de saída
4. WHEN um User autenticado envia POST /vouchers/usar com saldo insuficiente, THE Sistema_Backend SHALL retornar erro HTTP 400
5. WHEN o Sistema confirma coleta de material, THE Sistema_Backend SHALL creditar VoucherVerde e criar Transacao de entrada
6. WHEN o saldo de VoucherVerde é atualizado, THE Sistema_Backend SHALL garantir que saldo_atual nunca seja negativo

### Requisito 10: Endpoints de Pontos de Coleta

**User Story:** Como usuário autenticado, eu quero visualizar pontos de coleta próximos, para que eu possa escolher onde entregar meus recicláveis.

#### Acceptance Criteria

1. WHEN um User autenticado envia GET /coleta/pontos, THE Sistema_Backend SHALL retornar lista de PontoColetaResponse com status ativo
2. WHEN um User autenticado envia GET /coleta/pontos?material=plastico, THE Sistema_Backend SHALL retornar apenas pontos que aceitem plástico
3. WHEN um User autenticado envia GET /coleta/pontos/{id}, THE Sistema_Backend SHALL retornar PontoColetaResponse do ponto específico
4. WHEN um User autenticado envia GET /coleta/pontos/{id} com id inexistente, THE Sistema_Backend SHALL retornar erro HTTP 404

### Requisito 11: Endpoints de Agendamentos

**User Story:** Como usuário autenticado, eu quero agendar entregas de materiais recicláveis, para que eu possa planejar minhas coletas.

#### Acceptance Criteria

1. WHEN um User autenticado envia POST /coleta/agendamentos com dados válidos, THE Sistema_Backend SHALL criar Agendamento e retornar AgendamentoResponse
2. WHEN um User autenticado envia POST /coleta/agendamentos com ponto_id inexistente, THE Sistema_Backend SHALL retornar erro HTTP 404
3. WHEN um User autenticado envia GET /coleta/agendamentos, THE Sistema_Backend SHALL retornar lista de AgendamentoResponse do usuário ordenada por horário
4. WHEN um User autenticado envia PUT /coleta/agendamentos/{id} com status válido, THE Sistema_Backend SHALL atualizar status do Agendamento
5. WHEN um User autenticado tenta atualizar Agendamento de outro usuário, THE Sistema_Backend SHALL retornar erro HTTP 403

### Requisito 12: Endpoints de Missões

**User Story:** Como usuário autenticado, eu quero visualizar missões disponíveis e meu progresso, para que eu possa completar desafios e ganhar recompensas.

#### Acceptance Criteria

1. WHEN um User autenticado envia GET /missoes, THE Sistema_Backend SHALL retornar lista de MissaoResponse com todas as missões disponíveis
2. WHEN um User autenticado envia GET /missoes/ativas, THE Sistema_Backend SHALL retornar lista de missões em progresso com percentual de conclusão
3. WHEN um User completa uma Missao, THE Sistema_Backend SHALL creditar xp_recompensa e voucher_recompensa
4. WHEN um User completa uma Missao, THE Sistema_Backend SHALL marcar ProgressoMissao.concluida como true

### Requisito 13: Endpoints de Parceiros

**User Story:** Como usuário autenticado, eu quero visualizar estabelecimentos parceiros, para que eu possa usar meus VoucherVerde.

#### Acceptance Criteria

1. WHEN um User autenticado envia GET /parceiros, THE Sistema_Backend SHALL retornar lista de ParceiroResponse com parceiros ativos
2. WHEN um User autenticado envia GET /parceiros?categoria=supermercados, THE Sistema_Backend SHALL retornar apenas parceiros da categoria especificada
3. WHEN um User autenticado envia GET /parceiros/{id}, THE Sistema_Backend SHALL retornar ParceiroResponse do parceiro específico
4. WHEN um User autenticado envia GET /parceiros/{id} com id inexistente, THE Sistema_Backend SHALL retornar erro HTTP 404

### Requisito 14: Camada de Repositories

**User Story:** Como desenvolvedor, eu quero camada de acesso a dados isolada, para que a lógica de banco seja reutilizável e testável.

#### Acceptance Criteria

1. THE Sistema_Backend SHALL ter repositories em backend/app/repositories/
2. THE Sistema_Backend SHALL ter CRUDBase genérico com métodos: get, get_multi, create, update, delete
3. THE Sistema_Backend SHALL ter UserRepository com métodos: get_by_email, get_by_cpf
4. THE Sistema_Backend SHALL ter VoucherRepository com métodos: get_by_user, add_transacao
5. THE Sistema_Backend SHALL ter ColetaRepository com métodos: get_pontos_by_material, get_agendamentos_by_user
6. THE Sistema_Backend SHALL ter MissaoRepository com métodos: get_ativas_by_user, update_progresso

### Requisito 15: Camada de Services

**User Story:** Como desenvolvedor, eu quero camada de lógica de negócio isolada, para que as regras do sistema sejam centralizadas e testáveis.

#### Acceptance Criteria

1. THE Sistema_Backend SHALL ter services em backend/app/services/
2. THE Sistema_Backend SHALL ter AuthService com métodos: register, login, refresh_token, logout
3. THE Sistema_Backend SHALL ter VoucherService com métodos: get_saldo, get_historico, usar, creditar
4. THE Sistema_Backend SHALL ter ColetaService com métodos: listar_pontos, criar_agendamento, atualizar_status
5. THE Sistema_Backend SHALL ter MissaoService com métodos: get_ativas, atualizar_progresso, verificar_conclusao
6. THE Services SHALL usar Repositories para acesso ao Database
7. THE Services SHALL implementar regras de negócio como cálculo de nível, XP e bônus

### Requisito 16: Configuração CORS

**User Story:** Como desenvolvedor, eu quero configuração CORS adequada, para que o frontend possa consumir a API sem erros de segurança.

#### Acceptance Criteria

1. THE Sistema_Backend SHALL ter middleware CORS configurado no main.py
2. THE Sistema_Backend SHALL permitir origens definidas em ALLOWED_ORIGINS do arquivo .env
3. THE Sistema_Backend SHALL permitir credentials (cookies e headers de autenticação)
4. THE Sistema_Backend SHALL permitir todos os métodos HTTP (GET, POST, PUT, DELETE, OPTIONS)
5. THE Sistema_Backend SHALL permitir todos os headers necessários para JWT

### Requisito 17: Tratamento de Erros

**User Story:** Como desenvolvedor, eu quero tratamento de erros padronizado, para que a API retorne mensagens consistentes e úteis.

#### Acceptance Criteria

1. THE Sistema_Backend SHALL ter exception handlers customizados em core/exceptions.py
2. WHEN ocorre erro de validação Pydantic, THE Sistema_Backend SHALL retornar HTTP 422 com detalhes dos campos inválidos
3. WHEN ocorre erro de autenticação, THE Sistema_Backend SHALL retornar HTTP 401 com mensagem descritiva
4. WHEN ocorre erro de autorização, THE Sistema_Backend SHALL retornar HTTP 403 com mensagem descritiva
5. WHEN ocorre erro de recurso não encontrado, THE Sistema_Backend SHALL retornar HTTP 404 com mensagem descritiva
6. WHEN ocorre erro de regra de negócio, THE Sistema_Backend SHALL retornar HTTP 400 com mensagem descritiva
7. WHEN ocorre erro interno não tratado, THE Sistema_Backend SHALL retornar HTTP 500 sem expor detalhes internos

### Requisito 18: Servidor Frontend Node.js

**User Story:** Como desenvolvedor, eu quero servidor HTTP dedicado para o frontend, para que o sistema não dependa de extensões de IDE.

#### Acceptance Criteria

1. THE Sistema_Frontend SHALL ter arquivo server.js com Express configurado
2. THE Sistema_Frontend SHALL servir arquivos estáticos da pasta public/
3. THE Sistema_Frontend SHALL implementar SPA fallback retornando index.html para todas as rotas
4. THE Sistema_Frontend SHALL rodar na porta 3000 por padrão
5. THE Sistema_Frontend SHALL ter script npm start para produção
6. THE Sistema_Frontend SHALL ter script npm run dev com nodemon para desenvolvimento com hot-reload
7. THE Sistema_Frontend SHALL ter package.json com dependências: express, nodemon

### Requisito 19: Cliente API Frontend

**User Story:** Como desenvolvedor frontend, eu quero cliente centralizado para consumir a API, para que as chamadas HTTP sejam consistentes e reutilizáveis.

#### Acceptance Criteria

1. THE Sistema_Frontend SHALL ter arquivo public/api.js com objeto api centralizado
2. THE api SHALL ter método login(email, senha) que retorne Access_Token e Refresh_Token
3. THE api SHALL ter método register(userData) que crie novo usuário
4. THE api SHALL ter método logout() que invalide tokens
5. THE api SHALL ter método getMe() que retorne perfil do usuário autenticado
6. THE api SHALL ter método getStats() que retorne estatísticas do usuário
7. THE api SHALL ter método getSaldo() que retorne saldo de VoucherVerde
8. THE api SHALL ter método getHistorico() que retorne transações
9. THE api SHALL ter método getPontos(material) que retorne pontos de coleta
10. THE api SHALL ter método criarAgendamento(dados) que crie agendamento
11. THE api SHALL ter método getMissoesAtivas() que retorne missões em progresso
12. THE api SHALL ter método getParceiros() que retorne lista de parceiros
13. THE api SHALL armazenar Access_Token e Refresh_Token no localStorage
14. THE api SHALL incluir Access_Token no header Authorization de todas as requisições autenticadas

### Requisito 20: Integração Frontend com API

**User Story:** Como usuário, eu quero que o frontend consuma dados reais da API, para que minhas ações sejam persistidas no banco de dados.

#### Acceptance Criteria

1. WHEN o usuário faz login no frontend, THE Sistema_Frontend SHALL chamar api.login() e armazenar tokens
2. WHEN o usuário acessa a tela Home, THE Sistema_Frontend SHALL chamar api.getSaldo() e api.getMissoesAtivas()
3. WHEN o usuário acessa a tela Carteira, THE Sistema_Frontend SHALL chamar api.getHistorico()
4. WHEN o usuário acessa a tela Mapa, THE Sistema_Frontend SHALL chamar api.getPontos()
5. WHEN o usuário filtra pontos por material, THE Sistema_Frontend SHALL chamar api.getPontos(material)
6. WHEN o usuário acessa a tela Parceiros, THE Sistema_Frontend SHALL chamar api.getParceiros()
7. WHEN o usuário acessa a tela Perfil, THE Sistema_Frontend SHALL chamar api.getMe()
8. WHEN ocorre erro 401 em qualquer requisição, THE Sistema_Frontend SHALL redirecionar para tela de login

### Requisito 21: Seed Data

**User Story:** Como desenvolvedor, eu quero dados iniciais no banco, para que eu possa testar o sistema em desenvolvimento.

#### Acceptance Criteria

1. THE Sistema_Backend SHALL ter script seed_data.py em backend/app/seed/
2. THE seed_data.py SHALL popular PontoColeta com pelo menos 5 pontos em Manaus-AM
3. THE seed_data.py SHALL popular Parceiro com pelo menos 4 parceiros (1 por categoria)
4. THE seed_data.py SHALL popular Missao com pelo menos 3 missões ativas
5. WHEN o desenvolvedor executa `python -m app.seed.seed_data`, THE Sistema_Backend SHALL inserir dados no Database
6. THE seed_data.py SHALL verificar se dados já existem antes de inserir para evitar duplicação

### Requisito 22: Documentação da API

**User Story:** Como desenvolvedor, eu quero documentação automática da API, para que eu possa entender e testar os endpoints facilmente.

#### Acceptance Criteria

1. THE Sistema_Backend SHALL gerar documentação Swagger UI automaticamente via FastAPI
2. THE Sistema_Backend SHALL disponibilizar Swagger UI em http://localhost:8000/docs
3. THE Sistema_Backend SHALL disponibilizar ReDoc em http://localhost:8000/redoc
4. THE Sistema_Backend SHALL ter endpoint GET /health que retorne status do sistema
5. THE Sistema_Backend SHALL incluir descrições nos routers usando parâmetro tags
6. THE Sistema_Backend SHALL incluir title e description no objeto FastAPI

### Requisito 23: Testes Unitários

**User Story:** Como desenvolvedor, eu quero testes automatizados, para que eu possa garantir a qualidade do código.

#### Acceptance Criteria

1. THE Sistema_Backend SHALL ter testes em backend/tests/
2. THE Sistema_Backend SHALL ter conftest.py com fixtures de Database de teste e cliente HTTP
3. THE Sistema_Backend SHALL ter test_auth.py com testes de registro e login
4. THE Sistema_Backend SHALL ter test_vouchers.py com testes de saldo e transações
5. WHEN o desenvolvedor executa `pytest`, THE Sistema_Backend SHALL executar todos os testes
6. THE Sistema_Backend SHALL usar httpx como cliente HTTP para testes de endpoints FastAPI

### Requisito 24: Variáveis de Ambiente

**User Story:** Como desenvolvedor, eu quero configuração por ambiente, para que eu possa ter configurações diferentes em desenvolvimento e produção.

#### Acceptance Criteria

1. THE Sistema SHALL ter arquivo .env na raiz com variáveis: DATABASE_URL, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS, ENVIRONMENT, DEBUG, ALLOWED_ORIGINS
2. THE Sistema SHALL ter arquivo .env.example versionado no git como template
3. THE Sistema_Backend SHALL ler variáveis do .env via pydantic-settings
4. THE Sistema_Backend SHALL validar presença de variáveis obrigatórias na inicialização
5. WHEN ENVIRONMENT=development, THE Sistema_Backend SHALL habilitar logs detalhados
6. WHEN ENVIRONMENT=production, THE Sistema_Backend SHALL desabilitar DEBUG

### Requisito 25: Docker Compose (Opcional)

**User Story:** Como desenvolvedor, eu quero orquestração de containers, para que eu possa rodar o sistema completo com um comando.

#### Acceptance Criteria

1. WHERE docker-compose.yml existe, THE Sistema SHALL definir serviço mysql com MySQL 8.x
2. WHERE docker-compose.yml existe, THE Sistema SHALL definir serviço backend com Python + FastAPI
3. WHERE docker-compose.yml existe, THE Sistema SHALL definir serviço frontend com Node.js + Express
4. WHERE docker-compose.yml existe, WHEN o desenvolvedor executa `docker-compose up`, THE Sistema SHALL iniciar todos os serviços
5. WHERE docker-compose.yml existe, THE Sistema SHALL configurar rede interna para comunicação entre serviços
6. WHERE docker-compose.yml existe, THE Sistema SHALL montar volumes para persistência do Database

## Notas de Implementação

### Ordem de Implementação Recomendada (5 Fases)

**Fase 1 — Fundação do Backend:**
- Estrutura de pastas
- Configuração FastAPI + Uvicorn + SQLAlchemy + MySQL
- Implementação de config.py e database.py
- Criação de todos os modelos SQLAlchemy
- Configuração do Alembic e geração da migration inicial
- Validação do schema no MySQL

**Fase 2 — Autenticação e Usuários:**
- Implementação de core/security.py
- Schemas Pydantic (UserCreate, UserLogin, UserResponse, TokenResponse)
- Services: auth_service.py
- Repositories: user_repo.py
- Routers: auth.py e users.py
- Dependency get_current_user()
- Configuração CORS

**Fase 3 — Features de Negócio:**
- VoucherService, ColetaService, MissaoService
- Repositories correspondentes
- Routers: vouchers, coletas, missoes, parceiros
- Seed data
- Validação de regras de negócio

**Fase 4 — Frontend Server e Integração:**
- Criação de frontend/server.js
- Criação de frontend/public/api.js
- Adaptação do script.js para consumir API real
- Integração de todas as telas
- Teste do fluxo completo

**Fase 5 — Qualidade e Finalização:**
- Testes unitários (pytest)
- Testes de endpoints (httpx)
- Documentação OpenAPI/Swagger
- Tratamento de erros padronizado
- README.md
- docker-compose.yml (opcional)

### Considerações de Segurança

- Senhas NUNCA devem ser armazenadas em texto plano
- SECRET_KEY deve ser gerada com alta entropia (mínimo 32 caracteres aleatórios)
- Tokens JWT devem ter tempo de expiração adequado
- CORS deve ser configurado apenas para origens confiáveis
- Validação de entrada deve ser feita em todos os endpoints
- Erros internos não devem expor detalhes de implementação

### Considerações de Performance

- Usar índices no banco para campos frequentemente consultados (email, cpf)
- Implementar paginação em endpoints que retornam listas
- Usar eager loading para evitar N+1 queries em relacionamentos
- Configurar pool de conexões do SQLAlchemy adequadamente
- Considerar cache para dados que mudam pouco (parceiros, missões)

### Considerações de Manutenibilidade

- Seguir princípios SOLID na organização do código
- Manter separação clara entre camadas (Router → Service → Repository)
- Documentar funções complexas com docstrings
- Usar type hints em todo o código Python
- Manter consistência de nomenclatura (português para domínio, inglês para código)
