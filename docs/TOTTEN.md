# EcoDrop Totem — Documentação de Integração

## Visão Geral

O totem é um ponto de coleta físico automatizado que compartilha o mesmo banco de dados (`ecodrop_db`) do aplicativo principal. Sua função é exclusivamente **operacional**: o usuário já chega ao totem com cadastro feito e missão ativa definida pelo app.

| | App principal | Totem |
|--|--|--|
| Cadastro | Sim | Não |
| Escolha de missão | Sim | Não (só exibe a ativa) |
| Entrega de material | Não | Sim (garrafas plásticas) |
| Histórico / saldo | Sim | Apenas exibe resultado |

**Material exclusivo do totem:** garrafa plástica (`unidade = 'un'`)

---

## Fluxo de Telas × Operações no Banco

### 1. Identificação do Usuário

O usuário se identifica no totem via QR Code gerado pelo app (contém o `usuario_id` + token de curta duração) ou digitando o CPF/e-mail.

**Leitura no banco:**
```sql
-- Valida o usuário
SELECT id, nome, nivel, xp_total, saldo, status
FROM usuarios
WHERE id = :usuario_id AND status = 'active';

-- Busca a missão ativa do usuário (se houver)
SELECT
    mu.id          AS missao_usuario_id,
    mu.progresso_atual,
    mu.status      AS progresso_status,
    m.titulo,
    m.meta_quantidade,
    m.recompensa_tipo,
    m.recompensa_valor
FROM missoes_usuario mu
JOIN missoes m ON m.id = mu.missao_id
WHERE mu.usuario_id = :usuario_id
  AND mu.status     = 'active'
  AND m.status      = 'active'
  AND m.tipo        IN ('material_count')   -- missões por unidade
  AND NOW() BETWEEN m.inicio_em AND m.fim_em
LIMIT 1;
```

**Tela exibida:** nome do usuário, nível, missão ativa (se tiver), progresso atual.

---

### 2. Início da Sessão de Coleta

Ao confirmar a identidade, o totem cria uma entrega com status inicial `pending_confirmation`. Isso registra que a sessão começou.

**Escrita no banco:**
```sql
-- Cria o registro da entrega (a entrega é confirmada automaticamente ao finalizar)
INSERT INTO entregas (
    usuario_id, ponto_id, agendamento_id,
    protocolo, status, criado_em
) VALUES (
    :usuario_id,
    :ponto_id_do_totem,   -- ID fixo do totem como ponto_coleta
    NULL,                 -- totem não usa agendamento
    :protocolo_gerado,    -- ex: 'TOT-20260517-000123'
    'pending_confirmation',
    NOW()
);
-- Salvar o entrega_id retornado para os próximos passos
```

> O `ponto_id` do totem deve estar cadastrado na tabela `pontos_coleta` com o `slug` identificando que é um totem (ex: `totem-centro`).

---

### 3. Inserção de Garrafa (simulação de leitura)

A cada garrafa inserida, o totem exibe o carregamento de 5–10 segundos. **Nenhuma escrita no banco ocorre aqui** — o registro dos itens é acumulado em memória local até a finalização.

**Estado local do totem (memória/sessão):**
```json
{
  "entrega_id": 42,
  "usuario_id": 7,
  "garrafas": 0,
  "pontos_acumulados": 0,
  "valor_acumulado": 0.00
}
```

A cada garrafa confirmada, incrementa `garrafas += 1` e calcula:
- `pontos_acumulados += materiais.pontos_por_unidade`
- `valor_acumulado += materiais.valor_por_unidade`

**Leitura necessária (uma vez ao iniciar a sessão):**
```sql
-- Busca o material "garrafa plástica" ativo
SELECT id, pontos_por_unidade, valor_por_unidade
FROM materiais
WHERE slug = 'garrafa-plastica'   -- slug fixo acordado
  AND status = 'active'
LIMIT 1;
```

---

### 4. Finalização — Confirmação da Coleta

Quando o usuário pressiona **"Finalizar"**, o totem executa as operações abaixo **em uma única transação**.

```sql
START TRANSACTION;

-- 4.1 Registra os itens da entrega
INSERT INTO entrega_itens (
    entrega_id, material_id, quantidade,
    unidade, pontos_gerados, valor_creditado, criado_em
) VALUES (
    :entrega_id,
    :material_id_garrafa,
    :total_garrafas,       -- ex: 3
    'un',
    :pontos_acumulados,    -- ex: 30
    :valor_acumulado,      -- ex: 1.50
    NOW()
);

-- 4.2 Confirma a entrega
UPDATE entregas
SET
    status        = 'confirmed',
    confirmado_por = NULL,         -- automático pelo totem
    confirmado_em  = NOW()
WHERE id = :entrega_id;

-- 4.3 Credita na carteira do usuário
INSERT INTO transacoes_carteira (
    usuario_id, tipo, origem,
    referencia_id, valor,
    saldo_resultante, descricao, created_at
) VALUES (
    :usuario_id,
    'credit',
    'entrega_totem',
    :entrega_id,
    :valor_acumulado,
    (SELECT saldo FROM usuarios WHERE id = :usuario_id) + :valor_acumulado,
    CONCAT('Totem: ', :total_garrafas, ' garrafa(s) coletada(s)'),
    NOW()
);

-- 4.4 Atualiza saldo e XP do usuário
UPDATE usuarios
SET
    saldo      = saldo + :valor_acumulado,
    xp_total   = xp_total + :pontos_acumulados
WHERE id = :usuario_id;

-- 4.5 Atualiza progresso na missão (se houver missão ativa)
UPDATE missoes_usuario
SET progresso_atual = progresso_atual + :total_garrafas
WHERE id = :missao_usuario_id;

-- 4.6 Verifica se a missão foi concluída
-- (fazer após o UPDATE acima, checar progresso_atual >= meta_quantidade)
-- Se sim:
UPDATE missoes_usuario
SET
    status              = 'completed',
    concluida_em        = NOW(),
    recompensa_creditada_em = NOW()
WHERE id = :missao_usuario_id
  AND progresso_atual >= :meta_quantidade;

COMMIT;
```

---

### 5. Tela de Resultado

Após o `COMMIT`, o totem exibe:

| Campo | Origem |
|-------|--------|
| Total de garrafas | sessão local |
| EcoCoins creditados | `entrega_itens.pontos_gerados` |
| Valor creditado (R$) | `entrega_itens.valor_creditado` |
| Novo saldo | `usuarios.saldo` (releitura) |
| Missão concluída? | verificar `missoes_usuario.status` |

---

## Tabelas Envolvidas

| Tabela | Operação | Quando |
|--------|----------|--------|
| `usuarios` | SELECT | Identificação |
| `usuarios` | UPDATE (saldo, xp_total) | Finalização |
| `missoes` | SELECT | Identificação |
| `missoes_usuario` | SELECT | Identificação |
| `missoes_usuario` | UPDATE (progresso, status) | Finalização |
| `materiais` | SELECT | Início de sessão |
| `pontos_coleta` | referência fixa | — |
| `entregas` | INSERT | Início de sessão |
| `entregas` | UPDATE (status, confirmado_em) | Finalização |
| `entrega_itens` | INSERT | Finalização |
| `transacoes_carteira` | INSERT | Finalização |

---

## Pontos de Coleta — Cadastro do Totem

Cada totem físico deve estar cadastrado como um `ponto_coleta`. Sugestão de dados:

```sql
INSERT INTO pontos_coleta (
    nome, slug, descricao, endereco, cidade, estado, status, criado_em
) VALUES (
    'Totem EcoDrop — Centro',
    'totem-centro',
    'Totem automático de coleta de garrafas plásticas',
    'Av. Principal, 100',
    'São Paulo', 'SP',
    'active',
    NOW()
);

-- Vincular o material "garrafa plástica" ao totem
INSERT INTO ponto_materiais (ponto_id, material_id, status)
VALUES (:id_do_totem, :id_garrafa_plastica, 'active');
```

---

## Geração do Protocolo

O protocolo da entrega (`entregas.protocolo`) deve ser único e identificar que veio de um totem:

```
Formato: TOT-YYYYMMDD-NNNNNN
Exemplo: TOT-20260517-000042
```

Geração no backend/totem antes do INSERT:
```python
from datetime import date

def gerar_protocolo(sequence: int) -> str:
    today = date.today().strftime("%Y%m%d")
    return f"TOT-{today}-{sequence:06d}"
```

---

## Autenticação do Usuário no Totem

O totem usa o mesmo endpoint de login do app. O usuário digita **CPF + senha** na tela touch e o totem chama:

```
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@email.com",   -- ou CPF, dependendo do endpoint
  "senha": "••••••••"
}
```

**Resposta:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "usuario": {
    "id": 7,
    "nome": "João",
    "saldo": 12.50
  }
}
```

O `access_token` retornado é usado nas chamadas seguintes (buscar missão, criar entrega, finalizar). Nenhuma tabela extra é necessária — o fluxo de auth é idêntico ao do app.

> O protótipo roda inteiramente na web (frontend + backend), sem app mobile. QR Code não se aplica — o login com credenciais é o fluxo definitivo para este contexto.

---

## Resumo do Fluxo Completo

```
App                          Totem                        Banco de Dados
 |                             |                               |
 |-- Gera QR Code (token) ---->|                               |
 |                             |-- Valida token -------------->|
 |                             |<-- usuario_id + dados --------|
 |                             |-- Busca missão ativa -------->|
 |                             |<-- missao_usuario ------------|
 |                             |-- INSERT entregas ----------->|
 |                             |<-- entrega_id ----------------|
 |                             |                               |
 |                   [usuário insere garrafas]                  |
 |                   [contador local: N garrafas]               |
 |                             |                               |
 |                   [usuário finaliza]                         |
 |                             |-- TRANSACTION:                |
 |                             |   INSERT entrega_itens ------>|
 |                             |   UPDATE entregas ----------->|
 |                             |   INSERT transacoes_carteira->|
 |                             |   UPDATE usuarios ----------->|
 |                             |   UPDATE missoes_usuario ----->|
 |                             |-- COMMIT -------------------->|
 |                             |<-- confirmação ---------------|
 |                             |                               |
 |<-- push: saldo atualizado --|                               |
```

> O app recebe a atualização do saldo via polling ou push notification após o COMMIT.
