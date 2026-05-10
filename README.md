# EcoDrop

Aplicação web de reciclagem com carteira de VoucherVerde, agendamento de entregas, registro de materiais, missões, parceiros e suporte.

O projeto está dividido em:

- `backend/`: API Node.js + Express + MySQL.
- `frontend/`: interface estática servida pelo próprio backend.

## Requisitos

- Node.js 18+.
- MySQL 8+.
- npm.

## Como rodar

### 1. Criar o banco de dados

Crie um banco MySQL chamado `ecodrop` e execute o script abaixo:

```sql
SOURCE backend/database/setup.sql;
```

Se preferir via terminal MySQL:

```bash
mysql -u root -p ecodrop < backend/database/setup.sql
```

O script cria a estrutura principal e já insere dados base de materiais, pontos de coleta, parceiros e missões.

### 2. Configurar variáveis de ambiente

Crie o arquivo `backend/.env` com algo neste formato:

```env
PORT=5000
HOST=0.0.0.0

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=ecodrop

JWT_SECRET=troque_esta_chave_por_uma_secreta
JWT_EXPIRES_IN=7d

CORS_ORIGIN=http://127.0.0.1:5500,http://localhost:5500
```

Notas:

- `JWT_SECRET` é obrigatório para login e rotas autenticadas.
- `HOST=0.0.0.0` permite acessar a aplicação pelo IP da máquina na rede local.
- Se você usar apenas o frontend servido pelo backend em `:5000`, o `CORS_ORIGIN` é menos relevante.

### 3. Instalar dependências

```bash
cd backend
npm install
```

### 4. Iniciar a aplicação

Modo desenvolvimento:

```bash
cd backend
npm run dev
```

Modo normal:

```bash
cd backend
npm start
```

## Como acessar

Após subir o servidor, acesse:

- Local: `http://localhost:5000`
- Na rede local: `http://SEU_IP:5000`

Exemplo para celular na mesma rede Wi‑Fi:

- `http://192.168.1.10:5000`

O frontend já é servido pelo backend na rota raiz `/`, então não é necessário subir outro servidor para a pasta `frontend`.

## Fluxos principais

### Usuário comum

1. Criar conta.
2. Fazer login.
3. Ver pontos de coleta no mapa.
4. Agendar uma entrega.
5. Registrar uma entrega com materiais aceitos no ponto.
6. Acompanhar o histórico das entregas em Auto Atendimento.
7. Usar o saldo na carteira para resgatar benefícios dos parceiros.
8. Abrir tickets em suporte e responder no próprio app.

### Operador do ponto

Além do fluxo comum, operador pode:

1. Abrir `Auto Atendimento`.
2. Entrar em `Operação do ponto`.
3. Revisar entregas pendentes.
4. Confirmar ou rejeitar uma entrega.

Quando uma entrega é confirmada, o crédito é aplicado na carteira do usuário e o progresso de missões é atualizado.

## Como testar operador

O cadastro público cria usuários com perfil `user`. Para testar o fluxo de operador, promova um usuário no banco e vincule-o a um ponto de coleta.

Exemplo:

```sql
UPDATE usuarios
SET role = 'operator'
WHERE email = 'operador@teste.com';

INSERT INTO operadores_ponto (usuario_id, ponto_id, status)
SELECT u.id, p.id, 'active'
FROM usuarios u
JOIN pontos_coleta p ON p.slug = 'ecoponto-central'
WHERE u.email = 'operador@teste.com'
ON DUPLICATE KEY UPDATE status = 'active';
```

Para perfil `admin`, basta ajustar `role = 'admin'`.

## Rotas principais da API

### Autenticação

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Perfil

- `GET /users/me`
- `PUT /users/me`
- `PATCH /users/me/password`

### Carteira e resgates

- `GET /wallet/me`
- `GET /wallet/me/transactions`
- `GET /wallet/me/redemptions`
- `POST /wallet/redeem`

### Entregas e agendamentos

- `POST /appointments`
- `GET /appointments/me`
- `GET /deliveries/me`
- `POST /deliveries`
- `GET /deliveries/operator/pending`
- `PATCH /deliveries/:deliveryId/review`

### Parceiros, missões e suporte

- `GET /partners`
- `GET /missions/me`
- `GET /support/tickets`
- `GET /support/tickets/:ticketId`
- `POST /support/tickets`
- `POST /support/tickets/:ticketId/messages`

## Estrutura resumida

```text
backend/
  app.js
  server.js
  config/
  controllers/
  database/
  middleware/
  routes/
  services/
  validators/

frontend/
  index.html
  script.js
  css/
  assets/
```

## Observações

- O projeto ainda não possui suíte automatizada de testes.
- A interface foi pensada para rodar no navegador desktop e também no celular usando o IP da máquina.
- Se o login falhar com erro relacionado a JWT, revise o valor de `JWT_SECRET` no arquivo `backend/.env`.

## Comandos úteis

Instalar dependências:

```bash
cd backend
npm install
```

Rodar em desenvolvimento:

```bash
cd backend
npm run dev
```

Rodar em produção/local:

```bash
cd backend
npm start
```

Validar sintaxe do frontend:

```bash
cd backend
node --check ..\frontend\script.js
```