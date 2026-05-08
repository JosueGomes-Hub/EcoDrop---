CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    pontos INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reciclagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    material VARCHAR(100),
    quantidade DECIMAL(10,2),
    pontos_ganhos INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
);