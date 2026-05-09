require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const db = require("./config/db");

// TESTE API
app.get("/", (req, res) => {
  res.send("API funcionando!");
});

// CADASTRO
app.post("/cadastro", (req, res) => {
  const { nome, sobrenome, cpf, telefone, cep, cidade, estado, email, senha } =
    req.body;

  const sql = `
    INSERT INTO usuarios
    (nome, sobrenome, cpf, telefone, cep, cidade, estado, email, senha)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [nome, sobrenome, cpf, telefone, cep, cidade, estado, email, senha],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          erro: "Erro ao cadastrar",
        });
      }

      res.json({
        mensagem: "Usuário cadastrado!",
      });
    },
  );
});

// LOGIN
app.post("/login", (req, res) => {
  const { email, senha } = req.body;

  const sql = `
    SELECT * FROM usuarios
    WHERE email = ? AND senha = ?
  `;

  db.query(sql, [email, senha], (err, result) => {
    if (err) {
      return res.status(500).json({
        erro: "Erro no servidor",
      });
    }

    if (result.length > 0) {
      res.json({
        sucesso: true,
        usuario: result[0],
      });
    } else {
      res.status(401).json({
        sucesso: false,
        mensagem: "Email ou senha inválidos",
      });
    }
  });
});

// LISTAR USUÁRIOS
app.get("/usuarios", (req, res) => {
  db.query("SELECT * FROM usuarios", (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(result);
  });
});

app.listen(process.env.PORT, () => {
  console.log("Servidor rodando!");
});
