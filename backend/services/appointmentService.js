const db = require("../config/db");

const ApiError = require("../utils/apiError");

async function resolvePointIdBySlug(slug) {
  const [rows] = await db.execute(
    `
      SELECT id, nome, slug
      FROM pontos_coleta
      WHERE slug = ? AND status = 'active'
      LIMIT 1
    `,
    [slug],
  );

  return rows[0] ?? null;
}

async function createAppointment(userId, payload) {
  const point = await resolvePointIdBySlug(payload.pointSlug);

  if (!point) {
    throw new ApiError(404, "POINT_NOT_FOUND", "Ponto de coleta não encontrado.");
  }

  const [result] = await db.execute(
    `
      INSERT INTO agendamentos
        (usuario_id, ponto_id, data_agendada, janela_inicio, janela_fim, observacoes)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      point.id,
      payload.scheduledDate,
      payload.startTime,
      payload.endTime,
      payload.notes,
    ],
  );

  return {
    id: result.insertId,
    point: {
      slug: point.slug,
      name: point.nome,
    },
    scheduledDate: payload.scheduledDate,
    startTime: payload.startTime,
    endTime: payload.endTime,
    status: "scheduled",
    notes: payload.notes,
  };
}

async function listUserAppointments(userId) {
  const [rows] = await db.execute(
    `
      SELECT
        a.id,
        a.data_agendada,
        a.janela_inicio,
        a.janela_fim,
        a.status,
        a.observacoes,
        p.nome AS ponto_nome,
        p.slug AS ponto_slug,
        p.endereco
      FROM agendamentos a
      INNER JOIN pontos_coleta p ON p.id = a.ponto_id
      WHERE a.usuario_id = ?
      ORDER BY a.data_agendada DESC, a.janela_inicio DESC
    `,
    [userId],
  );

  return rows.map((row) => ({
    id: row.id,
    scheduledDate: row.data_agendada,
    startTime: row.janela_inicio,
    endTime: row.janela_fim,
    status: row.status,
    notes: row.observacoes,
    point: {
      slug: row.ponto_slug,
      name: row.ponto_nome,
      address: row.endereco,
    },
  }));
}

module.exports = {
  createAppointment,
  listUserAppointments,
};
