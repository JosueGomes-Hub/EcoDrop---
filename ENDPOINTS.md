# Documentação de Endpoints - EcoDrop API

## Índice
- [Autenticação](#autenticação)
- [Usuários](#usuários)
- [Coleta](#coleta)
- [Vouchers](#vouchers)
- [Missões](#missões)
- [Parceiros](#parceiros)
- [Suporte](#suporte)
- [Entregas](#entregas)
- [Totem](#totem)

---

## Autenticação

### POST `/auth/register`
**Descrição:** Registra um novo usuário no sistema.

**Status Code:** `201 Created`

**Request Body:**
```json
{
  "nome": "string",
  "email": "string",
  "cpf": "string",
  "senha": "string"
}
```

**Response:**
```json
{
  "id": "integer",
  "nome": "string",
  "email": "string",
  "cpf": "string",
  "nivel": "integer",
  "xp_total": "integer"
}
```

---

### POST `/auth/login`
**Descrição:** Realiza login do usuário e retorna tokens de acesso.

**Request Body:**
```json
{
  "email": "string",
  "senha": "string"
}
```

**Response:**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "bearer"
}
```

---

### POST `/auth/refresh`
**Descrição:** Renova o token de acesso usando o refresh token.

**Request Body:**
```json
{
  "refresh_token": "string"
}
```

**Response:**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "bearer"
}
```

---

### POST `/auth/logout`
**Descrição:** Realiza logout do usuário e invalida o refresh token.

**Status Code:** `204 No Content`

**Request Body:**
```json
{
  "refresh_token": "string"
}
```

---

## Usuários

### GET `/users/me`
**Descrição:** Retorna os dados do usuário autenticado.

**Autenticação:** Requerida

**Response:**
```json
{
  "id": "integer",
  "nome": "string",
  "email": "string",
  "cpf": "string",
  "nivel": "integer",
  "xp_total": "integer",
  "saldo": "decimal",
  "role": "string"
}
```

---

### PUT `/users/me`
**Descrição:** Atualiza os dados do usuário autenticado.

**Autenticação:** Requerida

**Request Body:**
```json
{
  "nome": "string (opcional)",
  "email": "string (opcional)",
  "telefone": "string (opcional)"
}
```

**Response:**
```json
{
  "id": "integer",
  "nome": "string",
  "email": "string",
  "cpf": "string",
  "nivel": "integer",
  "xp_total": "integer"
}
```

---

### GET `/users/me/stats`
**Descrição:** Retorna estatísticas do usuário autenticado.

**Autenticação:** Requerida

**Response:**
```json
{
  "xp_total": "integer",
  "nivel": "integer",
  "total_agendamentos": "integer",
  "missoes_concluidas": "integer"
}
```

---

### PATCH `/users/me/password`
**Descrição:** Altera a senha do usuário autenticado.

**Autenticação:** Requerida

**Request Body:**
```json
{
  "senhaAtual": "string",
  "novaSenha": "string",
  "confirmacaoNovaSenha": "string"
}
```

**Response:**
```json
{
  "message": "Senha atualizada com sucesso"
}
```

---

## Coleta

### GET `/coleta/pontos`
**Descrição:** Lista todos os pontos de coleta disponíveis, com filtros opcionais.

**Query Parameters:**
- `material` (opcional): Filtra por tipo de material
- `city` (opcional): Filtra por cidade

**Response:**
```json
[
  {
    "id": "integer",
    "nome": "string",
    "endereco": "string",
    "cidade": "string",
    "estado": "string",
    "cep": "string",
    "latitude": "decimal",
    "longitude": "decimal",
    "horario_abertura": "time",
    "horario_fechamento": "time",
    "materiais": ["string"]
  }
]
```

---

### GET `/coleta/pontos/{ponto_id}`
**Descrição:** Retorna detalhes de um ponto de coleta específico.

**Path Parameters:**
- `ponto_id`: ID do ponto de coleta

**Response:**
```json
{
  "id": "integer",
  "nome": "string",
  "endereco": "string",
  "cidade": "string",
  "estado": "string",
  "cep": "string",
  "latitude": "decimal",
  "longitude": "decimal",
  "horario_abertura": "time",
  "horario_fechamento": "time",
  "materiais": ["string"]
}
```

---

### POST `/coleta/agendamentos`
**Descrição:** Cria um novo agendamento de coleta.

**Autenticação:** Requerida

**Status Code:** `201 Created`

**Request Body:**
```json
{
  "ponto_id": "integer",
  "data_agendada": "datetime",
  "materiais": ["string"],
  "observacoes": "string (opcional)"
}
```

**Response:**
```json
{
  "id": "integer",
  "usuario_id": "integer",
  "ponto_id": "integer",
  "data_agendada": "datetime",
  "status": "string",
  "materiais": ["string"],
  "criado_em": "datetime"
}
```

---

### GET `/coleta/agendamentos`
**Descrição:** Lista todos os agendamentos do usuário autenticado.

**Autenticação:** Requerida

**Response:**
```json
[
  {
    "id": "integer",
    "usuario_id": "integer",
    "ponto_id": "integer",
    "data_agendada": "datetime",
    "status": "string",
    "materiais": ["string"],
    "criado_em": "datetime"
  }
]
```

---

### PUT `/coleta/agendamentos/{agendamento_id}`
**Descrição:** Atualiza o status de um agendamento.

**Autenticação:** Requerida

**Path Parameters:**
- `agendamento_id`: ID do agendamento

**Request Body:**
```json
{
  "status": "string"
}
```

**Response:**
```json
{
  "id": "integer",
  "usuario_id": "integer",
  "ponto_id": "integer",
  "data_agendada": "datetime",
  "status": "string",
  "materiais": ["string"],
  "criado_em": "datetime"
}
```

---

## Vouchers

### GET `/vouchers/saldo`
**Descrição:** Retorna o saldo de vouchers do usuário autenticado.

**Autenticação:** Requerida

**Response:**
```json
{
  "saldo": "decimal",
  "nivel": "integer",
  "bonus_percentual": "integer"
}
```

---

### GET `/vouchers/historico`
**Descrição:** Retorna o histórico de transações de vouchers do usuário.

**Autenticação:** Requerida

**Query Parameters:**
- `skip` (opcional, padrão: 0): Número de registros a pular
- `limit` (opcional, padrão: 50): Número máximo de registros

**Response:**
```json
[
  {
    "id": "integer",
    "tipo": "string",
    "valor": "decimal",
    "descricao": "string",
    "criado_em": "datetime"
  }
]
```

---

### POST `/vouchers/usar`
**Descrição:** Utiliza vouchers em um parceiro.

**Autenticação:** Requerida

**Request Body:**
```json
{
  "parceiro_id": "integer",
  "valor": "decimal"
}
```

**Response:**
```json
{
  "valor_pago": "decimal",
  "valor_efetivo": "decimal",
  "bonus_aplicado": "integer"
}
```

---

## Missões

### GET `/missoes`
**Descrição:** Lista todas as missões ativas disponíveis para o usuário.

**Autenticação:** Requerida

**Response:**
```json
[
  {
    "id": "integer",
    "titulo": "string",
    "descricao": "string",
    "tipo": "string",
    "meta_quantidade": "integer",
    "recompensa_tipo": "string",
    "recompensa_valor": "integer",
    "progresso_atual": "integer",
    "status": "string",
    "inicio_em": "datetime",
    "fim_em": "datetime"
  }
]
```

---

### GET `/missoes/ativas`
**Descrição:** Lista todas as missões ativas (mesmo endpoint que `/missoes`).

**Autenticação:** Requerida

**Response:** Mesmo formato de `/missoes`

---

### GET `/missoes/me`
**Descrição:** Lista as missões do usuário autenticado (mesmo endpoint que `/missoes`).

**Autenticação:** Requerida

**Response:** Mesmo formato de `/missoes`

---

## Parceiros

### GET `/parceiros`
**Descrição:** Lista todos os parceiros ativos.

**Query Parameters:**
- `categoria` (opcional): Filtra por categoria de parceiro

**Response:**
```json
[
  {
    "id": "integer",
    "nome": "string",
    "categoria": "string",
    "descricao": "string",
    "logo_url": "string",
    "status": "string"
  }
]
```

---

### GET `/parceiros/{parceiro_id}`
**Descrição:** Retorna detalhes de um parceiro específico.

**Path Parameters:**
- `parceiro_id`: ID do parceiro

**Response:**
```json
{
  "id": "integer",
  "nome": "string",
  "categoria": "string",
  "descricao": "string",
  "logo_url": "string",
  "status": "string"
}
```

---

## Suporte

### GET `/support/tickets`
**Descrição:** Lista todos os tickets de suporte do usuário autenticado.

**Autenticação:** Requerida

**Response:**
```json
[
  {
    "id": "integer",
    "usuario_id": "integer",
    "assunto": "string",
    "status": "string",
    "prioridade": "string",
    "criado_em": "datetime",
    "mensagens": [
      {
        "id": "integer",
        "mensagem": "string",
        "remetente": "string",
        "criado_em": "datetime"
      }
    ]
  }
]
```

---

### GET `/support/tickets/{ticket_id}`
**Descrição:** Retorna detalhes de um ticket específico.

**Autenticação:** Requerida

**Path Parameters:**
- `ticket_id`: ID do ticket

**Response:**
```json
{
  "id": "integer",
  "usuario_id": "integer",
  "assunto": "string",
  "status": "string",
  "prioridade": "string",
  "criado_em": "datetime",
  "mensagens": [
    {
      "id": "integer",
      "mensagem": "string",
      "remetente": "string",
      "criado_em": "datetime"
    }
  ]
}
```

---

### POST `/support/tickets`
**Descrição:** Cria um novo ticket de suporte.

**Autenticação:** Requerida

**Status Code:** `201 Created`

**Request Body:**
```json
{
  "assunto": "string",
  "mensagem": "string",
  "prioridade": "string (opcional)"
}
```

**Response:**
```json
{
  "id": "integer",
  "usuario_id": "integer",
  "assunto": "string",
  "status": "string",
  "prioridade": "string",
  "criado_em": "datetime",
  "mensagens": [
    {
      "id": "integer",
      "mensagem": "string",
      "remetente": "string",
      "criado_em": "datetime"
    }
  ]
}
```

---

### POST `/support/tickets/{ticket_id}/messages`
**Descrição:** Adiciona uma mensagem a um ticket existente.

**Autenticação:** Requerida

**Path Parameters:**
- `ticket_id`: ID do ticket

**Request Body:**
```json
{
  "mensagem": "string"
}
```

**Response:**
```json
{
  "id": "integer",
  "usuario_id": "integer",
  "assunto": "string",
  "status": "string",
  "prioridade": "string",
  "criado_em": "datetime",
  "mensagens": [
    {
      "id": "integer",
      "mensagem": "string",
      "remetente": "string",
      "criado_em": "datetime"
    }
  ]
}
```

---

## Entregas

### GET `/deliveries/me`
**Descrição:** Lista todas as entregas do usuário autenticado.

**Autenticação:** Requerida

**Response:**
```json
[
  {
    "id": "integer",
    "usuario_id": "integer",
    "ponto_id": "integer",
    "protocolo": "string",
    "status": "string",
    "criado_em": "datetime",
    "confirmado_em": "datetime",
    "itens": [
      {
        "material_id": "integer",
        "quantidade": "integer",
        "unidade": "string",
        "pontos_gerados": "integer",
        "valor_creditado": "decimal"
      }
    ]
  }
]
```

---

### POST `/deliveries`
**Descrição:** Cria uma nova entrega de materiais.

**Autenticação:** Requerida

**Status Code:** `201 Created`

**Request Body:**
```json
{
  "ponto_id": "integer",
  "agendamento_id": "integer (opcional)",
  "itens": [
    {
      "material_id": "integer",
      "quantidade": "integer",
      "unidade": "string"
    }
  ]
}
```

**Response:**
```json
{
  "id": "integer",
  "usuario_id": "integer",
  "ponto_id": "integer",
  "protocolo": "string",
  "status": "string",
  "criado_em": "datetime",
  "itens": [
    {
      "material_id": "integer",
      "quantidade": "integer",
      "unidade": "string",
      "pontos_gerados": "integer",
      "valor_creditado": "decimal"
    }
  ]
}
```

---

### GET `/deliveries/operator/pending`
**Descrição:** Lista entregas pendentes de revisão (apenas para operadores e admins).

**Autenticação:** Requerida (role: operator ou admin)

**Response:**
```json
[
  {
    "id": "integer",
    "usuario_id": "integer",
    "ponto_id": "integer",
    "protocolo": "string",
    "status": "string",
    "criado_em": "datetime",
    "itens": [
      {
        "material_id": "integer",
        "quantidade": "integer",
        "unidade": "string",
        "pontos_gerados": "integer",
        "valor_creditado": "decimal"
      }
    ]
  }
]
```

---

### PATCH `/deliveries/{delivery_id}/review`
**Descrição:** Revisa e aprova/rejeita uma entrega (apenas para operadores e admins).

**Autenticação:** Requerida (role: operator ou admin)

**Path Parameters:**
- `delivery_id`: ID da entrega

**Request Body:**
```json
{
  "status": "string",
  "observacoes": "string (opcional)"
}
```

**Response:**
```json
[
  {
    "id": "integer",
    "usuario_id": "integer",
    "ponto_id": "integer",
    "protocolo": "string",
    "status": "string",
    "criado_em": "datetime",
    "confirmado_em": "datetime",
    "itens": [
      {
        "material_id": "integer",
        "quantidade": "integer",
        "unidade": "string",
        "pontos_gerados": "integer",
        "valor_creditado": "decimal"
      }
    ]
  }
]
```

---

## Totem

### POST `/totem/validar-cpf`
**Descrição:** Valida o CPF do usuário e retorna seus dados junto com missão ativa em plástico.

**Request Body:**
```json
{
  "cpf": "string"
}
```

**Response:**
```json
{
  "usuario": {
    "id": "integer",
    "nome": "string",
    "nivel": "integer",
    "xp": "integer",
    "saldo": "decimal"
  },
  "missao": {
    "missao_usuario_id": "integer",
    "id": "integer",
    "titulo": "string",
    "meta_quantidade": "integer",
    "progresso_atual": "integer",
    "recompensa_valor": "integer"
  }
}
```

---

### POST `/totem/finalizar-coleta`
**Descrição:** Registra a entrega de garrafas no totem e credita pontos ao usuário.

**Request Body:**
```json
{
  "usuario_id": "integer",
  "missao_usuario_id": "integer (opcional)",
  "meta_quantidade": "integer (opcional)",
  "quantidade_garrafas": "integer"
}
```

**Response:**
```json
{
  "entrega_id": "integer",
  "quantidade_garrafas": "integer",
  "pontos_acumulados": "integer",
  "novo_total_ecopoints": "integer",
  "mensagem": "string"
}
```

---

### GET `/totem/historico/{usuario_id}`
**Descrição:** Retorna o histórico de entregas do usuário no totem.

**Path Parameters:**
- `usuario_id`: ID do usuário

**Response:**
```json
{
  "entregas": [
    {
      "id": "integer",
      "protocolo": "string",
      "criado_em": "datetime",
      "quantidade_garrafas": "integer",
      "pontos_gerados": "integer",
      "valor_creditado": "decimal"
    }
  ],
  "total_garrafas": "integer"
}
```

---

### GET `/totem/missao-ativa`
**Descrição:** Retorna a missão global ativa no momento.

**Response:**
```json
{
  "id": "integer",
  "titulo": "string",
  "meta_quantidade": "integer",
  "recompensa_tipo": "string",
  "recompensa_valor": "integer",
  "inicio_em": "datetime",
  "fim_em": "datetime"
}
```

---

## Notas Gerais

### Autenticação
Endpoints que requerem autenticação devem incluir o token JWT no header:
```
Authorization: Bearer {access_token}
```

### Códigos de Status HTTP
- `200 OK`: Requisição bem-sucedida
- `201 Created`: Recurso criado com sucesso
- `204 No Content`: Requisição bem-sucedida sem conteúdo de retorno
- `400 Bad Request`: Dados inválidos na requisição
- `401 Unauthorized`: Autenticação necessária ou token inválido
- `403 Forbidden`: Acesso negado (permissões insuficientes)
- `404 Not Found`: Recurso não encontrado
- `500 Internal Server Error`: Erro interno do servidor

### Base URL
```
http://localhost:8000
```

### Documentação Interativa
A API FastAPI fornece documentação interativa automática:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
