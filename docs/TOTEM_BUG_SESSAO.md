# Bug Report: Contador de Garrafas no Totem — Sessão Acumulando Progresso Anterior

## Descrição do Problema

Ao iniciar uma nova sessão de coleta no totem, o contador de "Garrafas coletadas" exibe o progresso acumulado de sessões anteriores somado às garrafas da sessão atual.

**Exemplo:**
- Sessão 1: usuário insere 2 garrafas → finaliza → banco registra `progresso_atual = 2` ✅
- Sessão 2: usuário insere 1 garrafa → totem exibe **3** garrafas → finaliza enviando `quantidade_garrafas = 3` ❌ (deveria ser 1)

## Causa Raiz

O endpoint `POST /totem/validar-cpf` retorna o campo `progresso_atual` da missão do usuário:

```json
{
  "missao": {
    "progresso_atual": 2,   ← progresso acumulado de todas as sessões anteriores
    ...
  }
}
```

O frontend do totem usa esse valor como **estado inicial do contador da sessão**, em vez de usá-lo apenas para exibição do progresso da missão. Quando o usuário insere 1 garrafa nova, o contador vai de 2 → 3, e ao finalizar envia `quantidade_garrafas: 3` para a API — creditando 3 garrafas ao invés de 1.

## Correção Necessária

### Opção A — Correção no Frontend do Totem (recomendada)
O contador de garrafas da sessão deve **sempre iniciar em 0**, independente do `progresso_atual` retornado pela API.

O `progresso_atual` deve ser usado **somente** para exibir o progresso da missão (ex: "2 / 10 concluídos"), nunca como valor inicial do contador de inserções da sessão atual.

```js
// ❌ Errado
let garrafasNaSessao = missao.progresso_atual;

// ✅ Correto
let garrafasNaSessao = 0;
// exibir separadamente: `${missao.progresso_atual} / ${missao.meta_quantidade} concluídos`
```

### Opção B — Correção no Backend
Renomear o campo para deixar a semântica explícita e evitar confusão futura:

```json
{
  "missao": {
    "progresso_anterior": 2,   ← total já acumulado antes desta sessão
    "meta_quantidade": 10
  }
}
```

---

## APIs do Sistema Relacionadas ao Totem

### 1. `POST /totem/validar-cpf`
Valida o CPF do usuário e retorna dados do usuário + missão ativa.

**Request:**
```json
{ "cpf": "000.000.000-00" }
```

**Response:**
```json
{
  "usuario": {
    "id": 1,
    "nome": "Walter",
    "nivel": 1,
    "xp": 0,
    "saldo": 0.0
  },
  "missao": {
    "missao_usuario_id": 3,
    "id": 1,
    "titulo": "Recicle 10 Garrafas de Plástico",
    "meta_quantidade": 10,
    "progresso_atual": 2,        ← ⚠️ ORIGEM DO BUG: progresso acumulado de sessões anteriores
    "recompensa_valor": 5
  }
}
```

---

### 2. `POST /totem/finalizar-coleta`
Registra a entrega de garrafas, credita EcoPoints e atualiza o progresso da missão.

**Request:**
```json
{
  "usuario_id": 1,
  "missao_usuario_id": 3,
  "meta_quantidade": 10,
  "quantidade_garrafas": 1      ← deve ser SOMENTE as garrafas inseridas nesta sessão
}
```

**Response:**
```json
{
  "entrega_id": 7,
  "quantidade_garrafas": 1,
  "pontos_acumulados": 2,
  "novo_total_ecopoints": 6,
  "mensagem": "Coleta registrada! 2 EcoPoints creditados."
}
```

**Comportamento interno:**
- Cria registro em `entregas` com `status = "confirmed"`
- Cria `entrega_itens` com o material `garrafa-plastico-2l`
- Credita pontos na carteira via `creditar()`
- Incrementa `missao_usuario.progresso_atual += quantidade_garrafas`
- Se `progresso_atual >= meta_quantidade`, marca missão como `completed`

---

### 3. `GET /totem/historico/{usuario_id}`
Retorna as últimas 10 entregas confirmadas do usuário no totem e o total de garrafas entregues.

**Response:**
```json
{
  "entregas": [
    {
      "id": 7,
      "protocolo": "TOT-20260517-000007",
      "criado_em": "2026-05-17T21:10:00",
      "quantidade_garrafas": 1,
      "pontos_gerados": 2,
      "valor_creditado": "0.20"
    }
  ],
  "total_garrafas": 3
}
```

---

### 4. `GET /totem/missao-ativa`
Retorna a missão global ativa no momento (sem vínculo com usuário específico).

**Response:**
```json
{
  "id": 1,
  "titulo": "Recicle 10 Garrafas de Plástico",
  "meta_quantidade": 10,
  "recompensa_tipo": "voucher",
  "recompensa_valor": 5,
  "inicio_em": "2026-05-17T00:00:00",
  "fim_em": "2026-06-16T00:00:00"
}
```

---

## Fluxo Correto Esperado no Totem

```
1. Usuário aproxima CPF
2. POST /totem/validar-cpf
   → exibir nome, nível, progresso da missão (somente leitura)
   → iniciar contador da sessão = 0

3. Usuário insere garrafa(s)
   → incrementar contador LOCAL da sessão (+1 por leitura)
   → NÃO chamar API a cada inserção

4. Usuário clica "Finalizar coleta"
   → POST /totem/finalizar-coleta com quantidade_garrafas = contador da sessão
   → exibir resultado (pontos creditados, novo progresso da missão)

5. Sessão encerrada — contador resetado para 0
```
