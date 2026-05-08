const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const db = require("./database/connection");

app.use(cors());
app.use(express.json());

// ROTA PRINCIPAL
app.get("/", (req, res) => {
  res.send("API EcoDrop funcionando 🚀");
});

// LISTAR USUÁRIOS
app.get("/usuarios", (req, res) => {
  const sql = "SELECT * FROM usuarios";

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    }

    res.json(result);
  });
});

// CADASTRO
app.post("/cadastro", (req, res) => {
  const { nome, email, senha, telefone, cidade } = req.body;

  const sql = `
    INSERT INTO usuarios
    (nome,email,senha,telefone,cidade)
    VALUES(?,?,?,?,?)
  `;

  db.query(sql, [nome, email, senha, telefone, cidade], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    }

    res.json({
      message: "Usuário cadastrado",
    });
  });
});

// LOGIN
app.post("/login", (req, res) => {
  const { email, senha } = req.body;

  const sql = "SELECT * FROM usuarios WHERE email = ? AND senha = ?";

  db.query(sql, [email, senha], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    }

    if (result.length > 0) {
      res.json({
        message: "Login realizado",
        usuario: result[0],
      });
    } else {
      res.status(401).json({
        message: "Usuário não encontrado",
      });
    }
  });
});

// SERVIDOR
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
