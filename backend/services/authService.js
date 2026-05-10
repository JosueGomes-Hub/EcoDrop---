const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const db = require("../config/db");
const ApiError = require("../utils/apiError");
const { getLevelMeta } = require("../utils/gamification");

function buildToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new ApiError(500, "JWT_NOT_CONFIGURED", "JWT_SECRET não configurado.");
  }

  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );
}

function buildPublicUser(user) {
  const levelMeta = getLevelMeta(user.xp_total);

  return {
    id: user.id,
    nome: user.nome,
    sobrenome: user.sobrenome,
    email: user.email,
    telefone: user.telefone,
    cep: user.cep,
    cidade: user.cidade,
    estado: user.estado,
    role: user.role,
    status: user.status,
    saldo: Number(user.saldo || 0),
    nivel: levelMeta.level,
    levelTitle: levelMeta.title,
    xpTotal: Number(user.xp_total || 0),
  };
}

async function findUserByEmail(email) {
  const [rows] = await db.execute(
    `
      SELECT *
      FROM usuarios
      WHERE email = ?
      LIMIT 1
    `,
    [email],
  );

  return rows[0] ?? null;
}

async function findUserById(userId) {
  const [rows] = await db.execute(
    `
      SELECT
        u.*,
        COUNT(DISTINCT CASE WHEN e.status = 'confirmed' THEN e.id END) AS entregas_confirmadas,
        COALESCE(SUM(CASE WHEN e.status = 'confirmed' THEN ei.quantidade ELSE 0 END), 0) AS total_reciclado
      FROM usuarios u
      LEFT JOIN entregas e ON e.usuario_id = u.id
      LEFT JOIN entrega_itens ei ON ei.entrega_id = e.id
      WHERE u.id = ?
      GROUP BY u.id
      LIMIT 1
    `,
    [userId],
  );

  return rows[0] ?? null;
}

async function registerUser(payload) {
  const [existingUsers] = await db.execute(
    `
      SELECT id, email, cpf
      FROM usuarios
      WHERE email = ? OR cpf = ?
    `,
    [payload.email, payload.cpf],
  );

  if (existingUsers.some((user) => user.email === payload.email)) {
    throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "Já existe uma conta com este e-mail.");
  }

  if (existingUsers.some((user) => user.cpf === payload.cpf)) {
    throw new ApiError(409, "CPF_ALREADY_EXISTS", "Já existe uma conta com este CPF.");
  }

  const passwordHash = await bcrypt.hash(payload.senha, 10);

  const [result] = await db.execute(
    `
      INSERT INTO usuarios
        (nome, sobrenome, cpf, telefone, cep, cidade, estado, email, senha, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', 'active')
    `,
    [
      payload.nome,
      payload.sobrenome,
      payload.cpf,
      payload.telefone,
      payload.cep,
      payload.cidade,
      payload.estado,
      payload.email,
      passwordHash,
    ],
  );

  const createdUser = await findUserByEmail(payload.email);

  return {
    token: buildToken(createdUser),
    usuario: buildPublicUser({
      ...createdUser,
      xp_total: 0,
      saldo: 0,
    }),
    userId: result.insertId,
  };
}

async function loginUser(payload) {
  const user = await findUserByEmail(payload.email);

  if (!user) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email ou senha inválidos.");
  }

  if (user.status !== "active") {
    throw new ApiError(403, "USER_BLOCKED", "Sua conta não está disponível para acesso.");
  }

  const isPasswordValid = await bcrypt.compare(payload.senha, user.senha);

  if (!isPasswordValid) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email ou senha inválidos.");
  }

  return {
    token: buildToken(user),
    usuario: buildPublicUser(user),
  };
}

async function getAuthenticatedUser(userId) {
  const user = await findUserById(userId);

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "Usuário autenticado não encontrado.");
  }

  const levelMeta = getLevelMeta(user.xp_total);

  return {
    ...buildPublicUser(user),
    metrics: {
      deliveries: Number(user.entregas_confirmadas || 0),
      recycledAmount: Number(user.total_reciclado || 0),
    },
    nextLevelXp: levelMeta.nextLevelXp,
    progressPercent: levelMeta.progressPercent,
    xpToNextLevel: levelMeta.xpToNextLevel,
  };
}

async function updateAuthenticatedUser(userId, payload) {
  const user = await findUserById(userId);

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "Usuário autenticado não encontrado.");
  }

  const fieldsToUpdate = Object.entries(payload.changes).filter(([field, value]) => value !== user[field]);

  if (!fieldsToUpdate.length) {
    throw new ApiError(400, "VALIDATION_ERROR", "Nenhum dado novo foi informado para atualização.");
  }

  const nextEmail = fieldsToUpdate.find(([field]) => field === "email")?.[1] || null;

  if (nextEmail) {
    if (!payload.currentPassword) {
      throw new ApiError(400, "VALIDATION_ERROR", "Informe a senha atual para alterar o e-mail.");
    }

    const isCurrentPasswordValid = await bcrypt.compare(payload.currentPassword, user.senha);

    if (!isCurrentPasswordValid) {
      throw new ApiError(401, "INVALID_CURRENT_PASSWORD", "Senha atual inválida.");
    }

    const existingUser = await findUserByEmail(nextEmail);

    if (existingUser && existingUser.id !== userId) {
      throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "Já existe uma conta com este e-mail.");
    }
  }

  const setClause = fieldsToUpdate.map(([field]) => `${field} = ?`).join(", ");
  const values = fieldsToUpdate.map(([, value]) => value);

  await db.execute(
    `
      UPDATE usuarios
      SET ${setClause}
      WHERE id = ?
    `,
    [...values, userId],
  );

  const updatedUser = await findUserById(userId);
  const profile = await getAuthenticatedUser(userId);

  return {
    token: nextEmail ? buildToken(updatedUser) : null,
    usuario: profile,
  };
}

async function changeAuthenticatedUserPassword(userId, payload) {
  const user = await findUserById(userId);

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "Usuário autenticado não encontrado.");
  }

  const isCurrentPasswordValid = await bcrypt.compare(payload.currentPassword, user.senha);

  if (!isCurrentPasswordValid) {
    throw new ApiError(401, "INVALID_CURRENT_PASSWORD", "Senha atual inválida.");
  }

  const passwordHash = await bcrypt.hash(payload.newPassword, 10);

  await db.execute(
    `
      UPDATE usuarios
      SET senha = ?
      WHERE id = ?
    `,
    [passwordHash, userId],
  );
}

module.exports = {
  changeAuthenticatedUserPassword,
  getAuthenticatedUser,
  loginUser,
  registerUser,
  updateAuthenticatedUser,
};
