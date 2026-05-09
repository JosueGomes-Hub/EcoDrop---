
-- Script de configuração inicial do banco de dados para o sistema Ecodrop
CREATE DATABASE IF NOT EXISTS ecodrop;

-- Criação das tabelas principais para o sistema de reciclagem Ecodrop
USE ecodrop;
CREATE TABLE IF NOT EXISTS usuarios (

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    sobrenome VARCHAR(100) NOT NULL,
    cpf VARCHAR(20) NOT NULL UNIQUE,
    telefone VARCHAR(20) NOT NULL,
    cep VARCHAR(10) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado CHAR(2) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    role ENUM('user', 'operator', 'admin') NOT NULL DEFAULT 'user',
    status ENUM('active', 'inactive', 'blocked') NOT NULL DEFAULT 'active',
    saldo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    nivel INT NOT NULL DEFAULT 1,
    xp_total INT NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS materiais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    categoria VARCHAR(50) NOT NULL,
    unidade ENUM('kg', 'un') NOT NULL DEFAULT 'kg',
    pontos_por_unidade INT NOT NULL,
    valor_por_unidade DECIMAL(10,2) NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pontos_coleta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    descricao VARCHAR(255) NULL,
    endereco VARCHAR(255) NOT NULL,
    bairro VARCHAR(120) NULL,
    cidade VARCHAR(100) NOT NULL,
    estado CHAR(2) NOT NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    distancia_km DECIMAL(5,2) NULL,
    abre_as TIME NULL,
    fecha_as TIME NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ponto_materiais (
    ponto_id INT NOT NULL,
    material_id INT NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    PRIMARY KEY (ponto_id, material_id),
    CONSTRAINT fk_ponto_materiais_ponto FOREIGN KEY (ponto_id) REFERENCES pontos_coleta(id),
    CONSTRAINT fk_ponto_materiais_material FOREIGN KEY (material_id) REFERENCES materiais(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS operadores_ponto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    ponto_id INT NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_operador_ponto (usuario_id, ponto_id),
    CONSTRAINT fk_operadores_ponto_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_operadores_ponto_ponto FOREIGN KEY (ponto_id) REFERENCES pontos_coleta(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS agendamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    ponto_id INT NOT NULL,
    data_agendada DATE NOT NULL,
    janela_inicio TIME NOT NULL,
    janela_fim TIME NOT NULL,
    status ENUM('scheduled', 'confirmed', 'checked_in', 'completed', 'cancelled', 'missed') NOT NULL DEFAULT 'scheduled',
    observacoes VARCHAR(255) NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_agendamentos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_agendamentos_ponto FOREIGN KEY (ponto_id) REFERENCES pontos_coleta(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS entregas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    ponto_id INT NOT NULL,
    agendamento_id INT NULL,
    protocolo VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('pending_confirmation', 'confirmed', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending_confirmation',
    observacoes_usuario VARCHAR(255) NULL,
    observacoes_operador VARCHAR(255) NULL,
    confirmado_por INT NULL,
    confirmado_em DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_entregas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_entregas_ponto FOREIGN KEY (ponto_id) REFERENCES pontos_coleta(id),
    CONSTRAINT fk_entregas_agendamento FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id),
    CONSTRAINT fk_entregas_confirmado_por FOREIGN KEY (confirmado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS entrega_itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entrega_id INT NOT NULL,
    material_id INT NOT NULL,
    quantidade DECIMAL(10,2) NOT NULL,
    unidade ENUM('kg', 'un') NOT NULL,
    pontos_gerados INT NOT NULL,
    valor_creditado DECIMAL(10,2) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_entrega_itens_entrega FOREIGN KEY (entrega_id) REFERENCES entregas(id),
    CONSTRAINT fk_entrega_itens_material FOREIGN KEY (material_id) REFERENCES materiais(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transacoes_carteira (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo ENUM('credit', 'debit', 'bonus', 'reversal', 'adjustment') NOT NULL,
    origem VARCHAR(50) NOT NULL,
    referencia_id INT NULL,
    valor DECIMAL(10,2) NOT NULL,
    saldo_resultante DECIMAL(10,2) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transacoes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS parceiros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    categoria VARCHAR(80) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    logo_emoji VARCHAR(10) NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_parceiros_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS beneficios_parceiro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parceiro_id INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    tipo ENUM('discount', 'credit', 'cashback', 'bill_payment') NOT NULL DEFAULT 'discount',
    custo_voucher DECIMAL(10,2) NOT NULL,
    valor_desconto DECIMAL(10,2) NULL,
    limite_periodo INT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_beneficio_parceiro_titulo (parceiro_id, titulo),
    CONSTRAINT fk_beneficios_parceiro FOREIGN KEY (parceiro_id) REFERENCES parceiros(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS resgates_voucher (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    beneficio_id INT NOT NULL,
    parceiro_id INT NOT NULL,
    valor_debitado DECIMAL(10,2) NOT NULL,
    codigo_resgate VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('generated', 'used', 'expired', 'cancelled') NOT NULL DEFAULT 'generated',
    expira_em DATETIME NULL,
    utilizado_em DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resgates_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_resgates_beneficio FOREIGN KEY (beneficio_id) REFERENCES beneficios_parceiro(id),
    CONSTRAINT fk_resgates_parceiro FOREIGN KEY (parceiro_id) REFERENCES parceiros(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS missoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    titulo VARCHAR(150) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    tipo ENUM('material_weight', 'material_count', 'monthly_goal') NOT NULL,
    material_id INT NULL,
    meta_quantidade DECIMAL(10,2) NOT NULL,
    recompensa_tipo ENUM('voucher', 'xp') NOT NULL DEFAULT 'voucher',
    recompensa_valor DECIMAL(10,2) NOT NULL,
    inicio_em DATE NOT NULL,
    fim_em DATE NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    CONSTRAINT fk_missoes_material FOREIGN KEY (material_id) REFERENCES materiais(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS missoes_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    missao_id INT NOT NULL,
    usuario_id INT NOT NULL,
    progresso_atual DECIMAL(10,2) NOT NULL DEFAULT 0,
    status ENUM('active', 'completed', 'expired') NOT NULL DEFAULT 'active',
    concluida_em DATETIME NULL,
    recompensa_creditada_em DATETIME NULL,
    UNIQUE KEY uq_missao_usuario (missao_id, usuario_id),
    CONSTRAINT fk_missoes_usuario_missao FOREIGN KEY (missao_id) REFERENCES missoes(id),
    CONSTRAINT fk_missoes_usuario_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bonus_mensais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mes_referencia CHAR(7) NOT NULL UNIQUE,
    titulo VARCHAR(150) NOT NULL,
    meta_total DECIMAL(10,2) NOT NULL,
    recompensa_valor DECIMAL(10,2) NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tickets_suporte (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    categoria VARCHAR(80) NOT NULL,
    assunto VARCHAR(150) NOT NULL,
    descricao TEXT NOT NULL,
    status ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
    prioridade ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tickets_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS interacoes_suporte (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    autor_id INT NOT NULL,
    mensagem TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_interacoes_ticket FOREIGN KEY (ticket_id) REFERENCES tickets_suporte(id),
    CONSTRAINT fk_interacoes_autor FOREIGN KEY (autor_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO materiais (nome, slug, categoria, unidade, pontos_por_unidade, valor_por_unidade)
VALUES
    ('Plástico', 'plastico', 'reciclavel', 'kg', 8, 0.80),
    ('Vidro', 'vidro', 'reciclavel', 'kg', 6, 0.60),
    ('Metal', 'metal', 'reciclavel', 'kg', 10, 1.00),
    ('Papel', 'papel', 'reciclavel', 'kg', 5, 0.50),
    ('Eletrônico', 'eletronico', 'especial', 'un', 15, 3.00)
AS new_material
ON DUPLICATE KEY UPDATE
    categoria = new_material.categoria,
    unidade = new_material.unidade,
    pontos_por_unidade = new_material.pontos_por_unidade,
    valor_por_unidade = new_material.valor_por_unidade,
    status = 'active';

INSERT INTO pontos_coleta (nome, slug, descricao, endereco, bairro, cidade, estado, distancia_km, abre_as, fecha_as)
VALUES
    ('EcoPonto Central', 'ecoponto-central', 'Ponto completo para recicláveis domésticos.', 'Av. Eduardo Ribeiro, 520', 'Centro', 'Manaus', 'AM', 0.30, '08:00:00', '18:00:00'),
    ('Coleta Norte', 'coleta-norte', 'Coleta para vidro e plástico na zona norte.', 'R. Recife, 230', 'Adrianópolis', 'Manaus', 'AM', 0.80, '08:00:00', '17:00:00'),
    ('Ponto Eletrônico Sul', 'ponto-eletronico-sul', 'Recebimento assistido de eletrônicos e baterias.', 'Av. Constantino Nery, 1200', 'Flores', 'Manaus', 'AM', 1.20, '09:00:00', '18:00:00'),
    ('EcoPonto Leste', 'ecoponto-leste', 'Ponto voltado para plástico e papel.', 'R. Belo Horizonte, 88', 'Aleixo', 'Manaus', 'AM', 1.90, '08:00:00', '17:00:00'),
    ('Shopping Coleta', 'shopping-coleta', 'Ponto parceiro instalado no shopping.', 'Shopping Manauara — Piso G1', 'Adrianópolis', 'Manaus', 'AM', 2.40, '10:00:00', '22:00:00')
AS new_ponto
ON DUPLICATE KEY UPDATE
    descricao = new_ponto.descricao,
    endereco = new_ponto.endereco,
    bairro = new_ponto.bairro,
    cidade = new_ponto.cidade,
    estado = new_ponto.estado,
    distancia_km = new_ponto.distancia_km,
    abre_as = new_ponto.abre_as,
    fecha_as = new_ponto.fecha_as,
    status = 'active';

INSERT INTO ponto_materiais (ponto_id, material_id)
SELECT p.id, m.id
FROM pontos_coleta p
JOIN materiais m
WHERE (p.slug = 'ecoponto-central' AND m.slug IN ('plastico', 'papel', 'metal'))
   OR (p.slug = 'coleta-norte' AND m.slug IN ('vidro', 'plastico'))
   OR (p.slug = 'ponto-eletronico-sul' AND m.slug IN ('eletronico'))
   OR (p.slug = 'ecoponto-leste' AND m.slug IN ('plastico', 'papel'))
   OR (p.slug = 'shopping-coleta' AND m.slug IN ('metal', 'vidro', 'plastico'))
ON DUPLICATE KEY UPDATE status = 'active';

INSERT INTO parceiros (nome, categoria, descricao, cidade, logo_emoji)
VALUES
    ('Mercado Verde', 'Supermercados', 'Rede de supermercados sustentáveis.', 'Manaus', '🥬'),
    ('Supermercado Econômico', 'Supermercados', 'Rede regional com foco em economia e impacto local.', 'Manaus', '🏬'),
    ('Energia AM', 'Contas e Serviços', 'Parceiro para abatimento em conta de energia.', 'Manaus', '⚡'),
    ('COSAMA', 'Contas e Serviços', 'Desconto aplicado em conta de água.', 'Manaus', '💧'),
    ('RestauraNatura', 'Alimentação', 'Culinária amazônica com insumos sustentáveis.', 'Manaus', '🍽️'),
    ('FarmaVerde', 'Farmácias', 'Rede de farmácias parceiras.', 'Manaus', '💊')
AS new_parceiro
ON DUPLICATE KEY UPDATE
    categoria = new_parceiro.categoria,
    descricao = new_parceiro.descricao,
    cidade = new_parceiro.cidade,
    logo_emoji = new_parceiro.logo_emoji,
    status = 'active';

INSERT INTO beneficios_parceiro (parceiro_id, titulo, descricao, tipo, custo_voucher, valor_desconto, limite_periodo)
SELECT *
FROM (
    SELECT
        id AS parceiro_id,
        'Até 15% de desconto' AS titulo,
        'Desconto em compras selecionadas.' AS descricao,
        'discount' AS tipo,
        15.00 AS custo_voucher,
        15.00 AS valor_desconto,
        1 AS limite_periodo
    FROM parceiros
    WHERE nome = 'Mercado Verde'
) AS new_beneficio
ON DUPLICATE KEY UPDATE
    descricao = new_beneficio.descricao,
    custo_voucher = new_beneficio.custo_voucher,
    valor_desconto = new_beneficio.valor_desconto,
    status = 'active';

INSERT INTO beneficios_parceiro (parceiro_id, titulo, descricao, tipo, custo_voucher, valor_desconto, limite_periodo)
SELECT *
FROM (
    SELECT
        id AS parceiro_id,
        'R$5 de desconto' AS titulo,
        'Aplicável uma vez por visita.' AS descricao,
        'credit' AS tipo,
        5.00 AS custo_voucher,
        5.00 AS valor_desconto,
        4 AS limite_periodo
    FROM parceiros
    WHERE nome = 'Supermercado Econômico'
) AS new_beneficio
ON DUPLICATE KEY UPDATE
    descricao = new_beneficio.descricao,
    custo_voucher = new_beneficio.custo_voucher,
    valor_desconto = new_beneficio.valor_desconto,
    status = 'active';

INSERT INTO beneficios_parceiro (parceiro_id, titulo, descricao, tipo, custo_voucher, valor_desconto, limite_periodo)
SELECT *
FROM (
    SELECT
        id AS parceiro_id,
        'Abatimento na conta' AS titulo,
        'Use o saldo para reduzir sua conta de energia.' AS descricao,
        'bill_payment' AS tipo,
        30.00 AS custo_voucher,
        30.00 AS valor_desconto,
        1 AS limite_periodo
    FROM parceiros
    WHERE nome = 'Energia AM'
) AS new_beneficio
ON DUPLICATE KEY UPDATE
    descricao = new_beneficio.descricao,
    custo_voucher = new_beneficio.custo_voucher,
    valor_desconto = new_beneficio.valor_desconto,
    status = 'active';

INSERT INTO beneficios_parceiro (parceiro_id, titulo, descricao, tipo, custo_voucher, valor_desconto, limite_periodo)
SELECT *
FROM (
    SELECT
        id AS parceiro_id,
        'Desconto de até 20%' AS titulo,
        'Aplicável na conta de água do mês.' AS descricao,
        'bill_payment' AS tipo,
        20.00 AS custo_voucher,
        20.00 AS valor_desconto,
        1 AS limite_periodo
    FROM parceiros
    WHERE nome = 'COSAMA'
) AS new_beneficio
ON DUPLICATE KEY UPDATE
    descricao = new_beneficio.descricao,
    custo_voucher = new_beneficio.custo_voucher,
    valor_desconto = new_beneficio.valor_desconto,
    status = 'active';

INSERT INTO beneficios_parceiro (parceiro_id, titulo, descricao, tipo, custo_voucher, valor_desconto, limite_periodo)
SELECT *
FROM (
    SELECT
        id AS parceiro_id,
        '10% no pedido' AS titulo,
        'Desconto direto no consumo.' AS descricao,
        'discount' AS tipo,
        10.00 AS custo_voucher,
        10.00 AS valor_desconto,
        2 AS limite_periodo
    FROM parceiros
    WHERE nome = 'RestauraNatura'
) AS new_beneficio
ON DUPLICATE KEY UPDATE
    descricao = new_beneficio.descricao,
    custo_voucher = new_beneficio.custo_voucher,
    valor_desconto = new_beneficio.valor_desconto,
    status = 'active';

INSERT INTO beneficios_parceiro (parceiro_id, titulo, descricao, tipo, custo_voucher, valor_desconto, limite_periodo)
SELECT *
FROM (
    SELECT
        id AS parceiro_id,
        '5% em medicamentos e higiene' AS titulo,
        'Desconto em itens elegíveis.' AS descricao,
        'discount' AS tipo,
        8.00 AS custo_voucher,
        5.00 AS valor_desconto,
        2 AS limite_periodo
    FROM parceiros
    WHERE nome = 'FarmaVerde'
) AS new_beneficio
ON DUPLICATE KEY UPDATE
    descricao = new_beneficio.descricao,
    custo_voucher = new_beneficio.custo_voucher,
    valor_desconto = new_beneficio.valor_desconto,
    status = 'active';

INSERT INTO missoes (slug, titulo, descricao, tipo, material_id, meta_quantidade, recompensa_tipo, recompensa_valor, inicio_em, fim_em)
SELECT *
FROM (
    SELECT
        'plastico-2kg' AS slug,
        'Recicle 2kg de Plástico' AS titulo,
        'Entregue pelo menos 2kg de plástico para ganhar bônus.' AS descricao,
        'material_weight' AS tipo,
        m.id AS material_id,
        2.00 AS meta_quantidade,
        'voucher' AS recompensa_tipo,
        5.00 AS recompensa_valor,
        CURDATE() AS inicio_em,
        DATE_ADD(CURDATE(), INTERVAL 30 DAY) AS fim_em
    FROM materiais m
    WHERE m.slug = 'plastico'
) AS new_missao
ON DUPLICATE KEY UPDATE
    descricao = new_missao.descricao,
    meta_quantidade = new_missao.meta_quantidade,
    recompensa_valor = new_missao.recompensa_valor,
    status = 'active';

INSERT INTO missoes (slug, titulo, descricao, tipo, material_id, meta_quantidade, recompensa_tipo, recompensa_valor, inicio_em, fim_em)
SELECT *
FROM (
    SELECT
        'vidro-1kg' AS slug,
        'Leve Vidro ao Ponto' AS titulo,
        'Ganhe bônus triplo ao iniciar sua reciclagem de vidro.' AS descricao,
        'material_weight' AS tipo,
        m.id AS material_id,
        1.00 AS meta_quantidade,
        'voucher' AS recompensa_tipo,
        9.00 AS recompensa_valor,
        CURDATE() AS inicio_em,
        DATE_ADD(CURDATE(), INTERVAL 30 DAY) AS fim_em
    FROM materiais m
    WHERE m.slug = 'vidro'
) AS new_missao
ON DUPLICATE KEY UPDATE
    descricao = new_missao.descricao,
    meta_quantidade = new_missao.meta_quantidade,
    recompensa_valor = new_missao.recompensa_valor,
    status = 'active';

INSERT INTO missoes (slug, titulo, descricao, tipo, material_id, meta_quantidade, recompensa_tipo, recompensa_valor, inicio_em, fim_em)
SELECT *
FROM (
    SELECT
        'eletronico-3-itens' AS slug,
        'Descarte Eletrônico' AS titulo,
        'Entregue 3 itens eletrônicos para liberar um bônus especial.' AS descricao,
        'material_count' AS tipo,
        m.id AS material_id,
        3.00 AS meta_quantidade,
        'voucher' AS recompensa_tipo,
        15.00 AS recompensa_valor,
        CURDATE() AS inicio_em,
        DATE_ADD(CURDATE(), INTERVAL 30 DAY) AS fim_em
    FROM materiais m
    WHERE m.slug = 'eletronico'
) AS new_missao
ON DUPLICATE KEY UPDATE
    descricao = new_missao.descricao,
    meta_quantidade = new_missao.meta_quantidade,
    recompensa_valor = new_missao.recompensa_valor,
    status = 'active';

INSERT INTO bonus_mensais (mes_referencia, titulo, meta_total, recompensa_valor, status)
VALUES (DATE_FORMAT(CURDATE(), '%Y-%m'), 'Meta do Mês', 10.00, 20.00, 'active')
AS new_bonus
ON DUPLICATE KEY UPDATE
    titulo = new_bonus.titulo,
    meta_total = new_bonus.meta_total,
    recompensa_valor = new_bonus.recompensa_valor,
    status = 'active';
