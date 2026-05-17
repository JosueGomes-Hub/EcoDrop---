# Documentação da API Totem - EcoDrop

## Visão Geral

O totem foi refatorado para **não acessar o banco de dados diretamente**. Agora todos os fluxos usam **endpoints HTTP da API EcoDrop** via transações ACID no backend.

**Benefícios:**
- ✅ Lógica centralizada no backend
- ✅ Auditoria e logging centralizado
- ✅ Sincronização correta de saldo e XP
- ✅ Segurança (sem queries diretas expostas)
- ✅ Escalabilidade (múltiplos totems)

---

## 1. Configuração Inicial

### Variáveis de Ambiente

```bash
# Arquivo .env do totem
API_BASE_URL=http://localhost:8000  # URL da API EcoDrop
TOTEM_ID=1                           # ID do totem em pontos_coleta
```

### Headers Obrigatórios

Todos os endpoints requerem:

```javascript
{
  "Content-Type": "application/json"
}
```

---

## 2. Fluxo de Autenticação: POST /totem/validar-cpf

### Descrição
Valida se o usuário existe, está ativo e possui missão ativa. Executado ao usuário inserir CPF no totem.

### Endpoint
```
POST {API_BASE_URL}/totem/validar-cpf
```

### Request
```json
{
  "cpf": "12345678901"
}
```

**Validações:**
- CPF deve ter exatamente 11 dígitos
- Apenas números (sem pontos ou hífens)

### Response (Sucesso 200)
```json
{
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "nivel": 5,
    "xp": 2500,
    "saldo": 150.75
  },
  "missao": {
    "missao_usuario_id": 42,
    "id": 10,
    "titulo": "Junho: Coleta de Plástico",
    "meta_quantidade": 100,
    "progresso_atual": 23,
    "recompensa_valor": 50
  }
}
```

**Campos:**
- `usuario.id`: ID único do usuário
- `usuario.xp`: EcoPoints acumulados (lifetime)
- `usuario.saldo`: Saldo em carteira (não usado no totem, apenas informativo)
- `missao`: Pode ser `null` se não houver missão ativa

### Response (Erro 404)
```json
{
  "detail": "Usuário não encontrado"
}
```

### Exemplo JavaScript
```javascript
async function validarCpf(cpf) {
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL}/totem/validar-cpf`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Erro:", error.detail);
      return null;
    }

    const data = await response.json();
    console.log("Usuário validado:", data.usuario.nome);
    console.log("Missão ativa:", data.missao?.titulo || "Nenhuma");
    
    return data;
  } catch (error) {
    console.error("Erro ao conectar à API:", error);
  }
}
```

---

## 3. Fluxo de Coleta: POST /totem/finalizar-coleta

### Descrição
Registra a entrega de garrafas **em transação ACID** no backend. Incrementa XP, saldo e progresso da missão atomicamente.

### Endpoint
```
POST {API_BASE_URL}/totem/finalizar-coleta
```

### Request
```json
{
  "usuario_id": 1,
  "missao_usuario_id": 42,
  "meta_quantidade": 100,
  "quantidade_garrafas": 15
}
```

**Campos obrigatórios:**
- `usuario_id`: ID retornado por `/validar-cpf`
- `quantidade_garrafas`: Número de garrafas coletadas (> 0)

**Campos opcionais:**
- `missao_usuario_id`: ID da relação usuário-missão (pode ser `null`)
- `meta_quantidade`: Meta da missão (obrigatório se `missao_usuario_id` for preenchido)

### Response (Sucesso 200)
```json
{
  "entrega_id": 1542,
  "quantidade_garrafas": 15,
  "pontos_acumulados": 150,
  "novo_total_ecopoints": 2650,
  "mensagem": "Coleta registrada! 150 EcoPoints creditados."
}
```

**Campos:**
- `entrega_id`: Identificador único da entrega
- `pontos_acumulados`: Pontos creditados nesta coleta
- `novo_total_ecopoints`: Total de XP após crédito (confirmação)

### O que acontece no backend:

1. **Cálculos automáticos:**
   - `pontos = material.pontos_por_unidade × quantidade_garrafas`
   - `valor = material.valor_por_unidade × quantidade_garrafas`

2. **Transação ACID:**
   ```
   BEGIN
   ├─ INSERT entregas (protocolo único)
   ├─ INSERT entrega_itens (registro de quantidade/pontos)
   ├─ INSERT transacoes_carteira (auditoria)
   ├─ UPDATE usuarios.xp_total (incrementa XP)
   ├─ UPDATE missoes_usuario.progresso_atual (se missão ativa)
   ├─ UPDATE missoes_usuario.status = 'completed' (se meta atingida)
   └─ COMMIT
   ```

3. **Resultado:**
   - ✅ `usuario.xp_total` incrementado
   - ✅ `transacoes_carteira` registrada com origem `entrega_totem`
   - ✅ Protocolo único gerado (`TOT-YYYYMMDD-NNNNNN`)
   - ✅ Missão atualizada (se aplicável)

### Response (Erro 400/404)
```json
{
  "detail": "Usuário não encontrado" | "Totem não configurado" | "Material não configurado"
}
```

### Exemplo JavaScript
```javascript
async function finalizarColeta(usuarioId, missaoUsuarioId, metaQuantidade, quantidadeGarrafas) {
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL}/totem/finalizar-coleta`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: usuarioId,
          missao_usuario_id: missaoUsuarioId,
          meta_quantidade: metaQuantidade,
          quantidade_garrafas: quantidadeGarrafas
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Erro ao finalizar coleta:", error.detail);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Entrega ${data.entrega_id} registrada`);
    console.log(`+${data.pontos_acumulados} pts (Total: ${data.novo_total_ecopoints})`);
    
    return data;
  } catch (error) {
    console.error("Erro ao conectar à API:", error);
  }
}
```

---

## 4. Fluxo de Histórico: GET /totem/historico/{usuario_id}

### Descrição
Retorna as últimas 10 entregas e total de garrafas do usuário.

### Endpoint
```
GET {API_BASE_URL}/totem/historico/{usuario_id}
```

**Parâmetros:**
- `usuario_id`: ID do usuário (Path parameter, obrigatório)

### Response (Sucesso 200)
```json
{
  "entregas": [
    {
      "id": 1542,
      "protocolo": "TOT-20260517-000042",
      "criado_em": "2026-05-17T14:23:00Z",
      "quantidade_garrafas": 15,
      "pontos_gerados": 150,
      "valor_creditado": 7.50
    },
    {
      "id": 1541,
      "protocolo": "TOT-20260517-000041",
      "criado_em": "2026-05-17T13:45:00Z",
      "quantidade_garrafas": 8,
      "pontos_gerados": 80,
      "valor_creditado": 4.00
    }
  ],
  "total_garrafas": 98
}
```

**Campos:**
- `entregas`: Array com até 10 últimas entregas (mais recentes primeiro)
- `protocolo`: Identificador único da entrega (`TOT-YYYYMMDD-NNNNNN`)
- `total_garrafas`: Soma de todas as garrafas entregues (histórico completo)

### Exemplo JavaScript
```javascript
async function carregarHistorico(usuarioId) {
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL}/totem/historico/${usuarioId}`
    );

    if (!response.ok) {
      console.error("Erro ao carregar histórico");
      return null;
    }

    const data = await response.json();
    console.log(`Total de garrafas entregues: ${data.total_garrafas}`);
    
    data.entregas.forEach(entrega => {
      console.log(
        `${entrega.protocolo} - ${entrega.quantidade_garrafas} garrafas (+${entrega.pontos_gerados} pts)`
      );
    });

    return data;
  } catch (error) {
    console.error("Erro ao conectar à API:", error);
  }
}
```

---

## 5. Fluxo de Missão Ativa: GET /totem/missao-ativa

### Descrição
Retorna a missão global ativa. Exibida no painel inicial do totem (não requer CPF).

### Endpoint
```
GET {API_BASE_URL}/totem/missao-ativa
```

### Response (Sucesso 200 - Com Missão)
```json
{
  "id": 10,
  "titulo": "Junho: Coleta de Plástico",
  "meta_quantidade": 100,
  "recompensa_tipo": "voucher",
  "recompensa_valor": 50,
  "inicio_em": "2026-06-01T00:00:00Z",
  "fim_em": "2026-06-30T23:59:59Z"
}
```

### Response (Sucesso 200 - Sem Missão)
```json
null
```

**Campos:**
- `id`: ID da missão
- `meta_quantidade`: Meta em número de garrafas
- `recompensa_valor`: Valor em EcoPoints (se `recompensa_tipo == "voucher"`)

### Exemplo JavaScript
```javascript
async function carregarMissaoAtiva() {
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL}/totem/missao-ativa`
    );

    if (!response.ok) {
      console.error("Erro ao carregar missão");
      return null;
    }

    const missao = await response.json();

    if (!missao) {
      console.log("Nenhuma missão ativa no momento");
      return null;
    }

    console.log(`Missão: ${missao.titulo}`);
    console.log(`Meta: ${missao.meta_quantidade} garrafas`);
    console.log(`Recompensa: ${missao.recompensa_valor} EcoPoints`);

    return missao;
  } catch (error) {
    console.error("Erro ao conectar à API:", error);
  }
}
```

---

## 6. Fluxo Completo: Exemplo Prático

### Cenário
1. Usuário chega ao totem
2. Insere CPF
3. Coleta 15 garrafas
4. Consulta histórico

### Implementação JavaScript Completa

```javascript
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

class TotemClient {
  async validarCpf(cpf) {
    const response = await fetch(`${API_BASE_URL}/totem/validar-cpf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf })
    });

    if (!response.ok) {
      throw new Error("CPF inválido ou usuário não encontrado");
    }

    return response.json();
  }

  async finalizarColeta(usuarioId, quantidadeGarrafas, missaoData = null) {
    const payload = {
      usuario_id: usuarioId,
      quantidade_garrafas: quantidadeGarrafas,
      missao_usuario_id: missaoData?.missao_usuario_id || null,
      meta_quantidade: missaoData?.meta_quantidade || null
    };

    const response = await fetch(`${API_BASE_URL}/totem/finalizar-coleta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Erro ao registrar coleta");
    }

    return response.json();
  }

  async carregarHistorico(usuarioId) {
    const response = await fetch(
      `${API_BASE_URL}/totem/historico/${usuarioId}`
    );

    if (!response.ok) {
      throw new Error("Erro ao carregar histórico");
    }

    return response.json();
  }

  async carregarMissaoAtiva() {
    const response = await fetch(`${API_BASE_URL}/totem/missao-ativa`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  }
}

// EXEMPLO DE USO
async function executarFluxoCompleto() {
  const client = new TotemClient();

  try {
    // 1. Validar CPF
    console.log("🔐 Validando CPF...");
    const validacao = await client.validarCpf("12345678901");
    const usuario = validacao.usuario;
    const missao = validacao.missao;

    console.log(`✅ Usuário: ${usuario.nome}`);
    console.log(`   XP Total: ${usuario.xp}`);
    console.log(`   Nível: ${usuario.nivel}`);

    if (missao) {
      console.log(`   Missão: ${missao.titulo}`);
      console.log(`   Progresso: ${missao.progresso_atual}/${missao.meta_quantidade}`);
    }

    // 2. Finalizar coleta
    console.log("\n🍾 Finalizando coleta...");
    const coleta = await client.finalizarColeta(
      usuario.id,
      15, // 15 garrafas
      missao ? {
        missao_usuario_id: missao.missao_usuario_id,
        meta_quantidade: missao.meta_quantidade
      } : null
    );

    console.log(`✅ Entrega ${coleta.entrega_id} registrada`);
    console.log(`   +${coleta.pontos_acumulados} EcoPoints`);
    console.log(`   XP Total: ${coleta.novo_total_ecopoints}`);

    // 3. Carregar histórico
    console.log("\n📋 Histórico:");
    const historico = await client.carregarHistorico(usuario.id);
    console.log(`   Total de garrafas: ${historico.total_garrafas}`);
    console.log(`   Últimas entregas:`);

    historico.entregas.slice(0, 3).forEach(e => {
      console.log(
        `   - ${e.protocolo}: ${e.quantidade_garrafas} garrafas (+${e.pontos_gerados} pts)`
      );
    });

  } catch (error) {
    console.error("❌ Erro:", error.message);
  }
}

// Executar
executarFluxoCompleto();
```

---

## 7. Códigos de Status HTTP

| Código | Significado | Exemplo |
|--------|-------------|---------|
| 200 | ✅ Sucesso | Validação OK, coleta registrada |
| 400 | ⚠️ Erro de validação | Material não configurado |
| 404 | ❌ Não encontrado | Usuário não existe, totem inválido |
| 500 | 🔥 Erro do servidor | Falha ao processar transação |

---

## 8. Tratamento de Erros

### Estratégia Recomendada

```javascript
async function fazerRequisicaoComRetry(url, options, maxRetries = 3) {
  for (let tentativa = 1; tentativa <= maxRetries; tentativa++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return response.json();

    } catch (error) {
      console.warn(`Tentativa ${tentativa}/${maxRetries} falhou:`, error.message);

      if (tentativa === maxRetries) {
        throw new Error(`Falha após ${maxRetries} tentativas: ${error.message}`);
      }

      // Aguarda antes de retentar (backoff exponencial)
      const delay = Math.pow(2, tentativa - 1) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

---

## 9. Checklist de Migração

- [ ] Remover todas as queries SQL diretas do totem
- [ ] Remover variáveis de conexão MySQL (`DB_HOST`, `DB_USER`, etc.)
- [ ] Adicionar `API_BASE_URL` e `TOTEM_ID` ao `.env`
- [ ] Implementar `TotemClient` com os 4 endpoints
- [ ] Testar fluxo completo: CPF → Coleta → Histórico
- [ ] Validar sincronização de XP vs saldo no backend
- [ ] Adicionar tratamento de timeout/retry
- [ ] Documentar novos endpoints no README do totem

---

## 10. Perguntas Frequentes

### P: E se a API cair?
**R:** O totem vai ficar offline. Adicione lógica de retry e fallback local (cache do último CPF validado). Nunca faça queries diretas ao banco como fallback.

### P: Como saber se a coleta foi registrada?
**R:** Use o `entrega_id` retornado. Se receber erro HTTP, a transação foi **revertida** (ROLLBACK automático). Nenhuma coleta foi registrada.

### P: Posso mudar o `API_BASE_URL` em tempo de execução?
**R:** Sim. Armazene em variável de ambiente ou arquivo de config. Permite trocar de servidor sem recompilar.

### P: O totem precisa de autenticação?
**R:** Não. O endpoint `/totem` é público. Segurança via `TOTEM_ID` fixo no backend (aceita apenas este ID em `pontos_coleta`).

### P: E se colher quantidade_garrafas = 0?
**R:** O backend retorna erro 400 (quantidade inválida). Valide no totem antes de enviar.

---

## 11. Resumo da Mudança

| Aspecto | Antes | Depois |
|--------|-------|--------|
| **Acesso ao BD** | Query direta (totem) | HTTP API (backend) |
| **Segurança** | Credenciais expostas | Sem credenciais expostas |
| **Transações** | Sem garantia ACID | ACID garantido (backend) |
| **Sincronização** | Manual, propenso a bugs | Automática, atômica |
| **Auditoria** | Sem logging centralizado | Registrado em `transacoes_carteira` |
| **Escalabilidade** | Um totem por vez | Múltiplos totems simultâneos |

---

## 12. Suporte

Para dúvidas ou erros, consulte:
- Logs do totem (stdout/stderr)
- Logs da API: `/backend/logs/`
- Status da API: `GET /health`

