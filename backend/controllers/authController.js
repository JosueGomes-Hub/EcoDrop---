const connection = require("../database/connection");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const {
      nome,
      sobrenome,
      cpf,
      telefone,
      cep,
      cidade,
      estado,
      email,
      senha,
    } = req.body;

    if (!nome || !sobrenome || !cpf || !telefone || !email || !senha) {
      return res.status(400).json({
        error: "Preencha todos os campos",
      });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const sql = `
      INSERT INTO usuarios
      (
        nome,
        sobrenome,
        cpf,
        telefone,
        cep,
        cidade,
        estado,
        email,
        senha
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    connection.query(
      sql,
      [nome, sobrenome, cpf, telefone, cep, cidade, estado, email, senhaHash],
      (err, result) => {
        if (err) {
          console.log(err);

          return res.status(500).json({
            error: "Erro ao cadastrar usuário",
          });
        }

        res.status(201).json({
          message: "Usuário criado com sucesso",
          userId: result.insertId,
        });
      },
    );
  } catch (error) {
    res.status(500).json({
      error: "Erro interno",
    });
  }
};

exports.login = (req, res) => {
  const { email, senha } = req.body;

  const sql = `
    SELECT * FROM usuarios
    WHERE email = ?
  `;

  connection.query(sql, [email], async (err, results) => {
    if (err) {
      return res.status(500).json({
        error: "Erro no servidor",
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        error: "Usuário não encontrado",
      });
    }

    const usuario = results[0];

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({
        error: "Senha inválida",
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.json({
      message: "Login realizado",
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        saldo: usuario.saldo,
        nivel: usuario.nivel,
      },
    });
  });
};
