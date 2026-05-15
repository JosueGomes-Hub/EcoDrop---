# Changelog — Refatoração dos Models (SQLAlchemy)

**Data:** 2026-05-14  
**Tipo:** Refatoração  
**Escopo:** `backend/app/models/`

---

## Contexto

O sistema estava utilizando `setup.sql` como fonte de verdade para o banco de dados.
Esta mudança migra essa responsabilidade para os models SQLAlchemy + Alembic, alinhando completamente a camada de models com a estrutura definida no SQL.

---

## Alterações

### `user.py` — reescrito
- Tabela renomeada de `users` → `usuarios`
- Campos adicionados: `sobrenome`, `telefone`, `cep`, `cidade`, `estado`, `saldo`
- Campo `status` adicionado com ENUM `active | inactive | blocked`
- Campo `senha_hash` renomeado para `senha`
- Tamanhos de `nome` e `email` ajustados para bater com o SQL
- Relacionamentos atualizados para refletir todos os novos models

### `voucher.py` — reescrito
- Tabela `vouchers_verde` removida (não existia no SQL)
- Tabela `transacoes` renomeada para `transacoes_carteira`
- FK alterada de `voucher_id` → `usuario_id`
- Campo `tipo` atualizado para ENUM `credit | debit | bonus | reversal | adjustment`
- Campos adicionados: `origem`, `referencia_id`, `saldo_resultante`

### `material.py` — criado
- Nova tabela `materiais`
- Campos: `nome`, `slug`, `categoria`, `unidade` (ENUM `kg | un`), `pontos_por_unidade`, `valor_por_unidade`, `status`

### `coleta.py` — reescrito
- `PontoColeta` (`pontos_coleta`): adicionados `slug`, `descricao`, `bairro`, `cidade`, `estado`, `distancia_km`, `abre_as`, `fecha_as`; `lat/lng Float` → `latitude/longitude DECIMAL(10,7)`; `ativo bool` → `status ENUM`; removido campo `materiais_aceitos JSON`
- `PontoMaterial` (`ponto_materiais`): nova tabela de associação entre pontos e materiais
- `OperadorPonto` (`operadores_ponto`): nova tabela para vincular operadores a pontos de coleta
- `Agendamento` (`agendamentos`): adicionados `janela_inicio`, `janela_fim`; `data_agendada` corrigido para `Date`; status atualizado para ENUM correto
- `Entrega` (`entregas`): nova tabela com `protocolo`, `status`, `observacoes_usuario`, `observacoes_operador`, `confirmado_por`, `confirmado_em`
- `EntregaItem` (`entrega_itens`): nova tabela com itens por entrega (`quantidade`, `unidade`, `pontos_gerados`, `valor_creditado`)

### `missao.py` — reescrito
- `Missao` (`missoes`): adicionados `slug`, `inicio_em`, `fim_em`, `material_id`; `tipo_material` → `tipo` ENUM; recompensa unificada em `recompensa_tipo` + `recompensa_valor`; `ativa bool` → `status ENUM`
- `ProgressoMissao` renomeado para `MissaoUsuario` (`missoes_usuario`): `progresso_atual` corrigido para `DECIMAL`; `concluida bool` → `status ENUM`; adicionados `concluida_em`, `recompensa_creditada_em`
- `BonusMensal` (`bonus_mensais`): nova tabela para metas mensais

### `parceiro.py` — reescrito
- `Parceiro` (`parceiros`): `logo_url` → `logo_emoji`; `ativo bool` → `status ENUM`; adicionado campo `cidade`
- `BeneficioParceiro` (`beneficios_parceiro`): nova tabela com `titulo`, `tipo` ENUM, `custo_voucher`, `valor_desconto`, `limite_periodo`
- `ResgateVoucher` (`resgates_voucher`): nova tabela com `codigo_resgate`, `status`, `expira_em`, `utilizado_em`

### `suporte.py` — criado
- `TicketSuporte` (`tickets_suporte`): `categoria`, `assunto`, `descricao`, `status` ENUM, `prioridade` ENUM
- `InteracaoSuporte` (`interacoes_suporte`): mensagens vinculadas a tickets

### `__init__.py` — atualizado
- Todos os novos models exportados em `__all__`

---

## Observações

- A tabela `refresh_tokens` não consta no `setup.sql` mas foi mantida no model — é necessária para autenticação JWT e será criada via Alembic.
- Após este PR, executar:
  ```bash
  alembic revision --autogenerate -m "refactor: align models with setup.sql"
  alembic upgrade head
  ```
