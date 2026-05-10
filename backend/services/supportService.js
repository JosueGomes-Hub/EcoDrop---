const db = require("../config/db");

const ApiError = require("../utils/apiError");

async function getTicketOwnedByUser(userId, ticketId) {
  const [rows] = await db.execute(
    `
      SELECT id, usuario_id, categoria, assunto, descricao, status, prioridade, criado_em, atualizado_em
      FROM tickets_suporte
      WHERE id = ? AND usuario_id = ?
      LIMIT 1
    `,
    [ticketId, userId],
  );

  return rows[0] ?? null;
}

async function listUserTickets(userId) {
  const [rows] = await db.execute(
    `
      SELECT
        t.id,
        t.categoria,
        t.assunto,
        t.status,
        t.prioridade,
        t.criado_em,
        t.atualizado_em,
        COUNT(i.id) AS interaction_count,
        MAX(i.criado_em) AS last_interaction_at
      FROM tickets_suporte t
      LEFT JOIN interacoes_suporte i ON i.ticket_id = t.id
      WHERE t.usuario_id = ?
      GROUP BY t.id
      ORDER BY t.atualizado_em DESC, t.criado_em DESC
    `,
    [userId],
  );

  return rows.map((row) => ({
    id: row.id,
    category: row.categoria,
    subject: row.assunto,
    status: row.status,
    priority: row.prioridade,
    createdAt: row.criado_em,
    updatedAt: row.atualizado_em,
    interactionCount: Number(row.interaction_count || 0),
    lastInteractionAt: row.last_interaction_at,
  }));
}

async function getTicketDetails(userId, ticketId) {
  const ticket = await getTicketOwnedByUser(userId, ticketId);

  if (!ticket) {
    throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket de suporte não encontrado.");
  }

  const [messages] = await db.execute(
    `
      SELECT
        i.id,
        i.mensagem,
        i.criado_em,
        i.autor_id,
        u.nome,
        u.sobrenome,
        u.role
      FROM interacoes_suporte i
      INNER JOIN usuarios u ON u.id = i.autor_id
      WHERE i.ticket_id = ?
      ORDER BY i.criado_em ASC, i.id ASC
    `,
    [ticketId],
  );

  return {
    id: ticket.id,
    category: ticket.categoria,
    subject: ticket.assunto,
    description: ticket.descricao,
    status: ticket.status,
    priority: ticket.prioridade,
    createdAt: ticket.criado_em,
    updatedAt: ticket.atualizado_em,
    messages: messages.map((message) => ({
      id: message.id,
      authorId: message.autor_id,
      authorName: `${message.nome} ${message.sobrenome}`.trim(),
      authorRole: message.role,
      message: message.mensagem,
      createdAt: message.criado_em,
    })),
  };
}

async function createTicket(userId, payload) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [ticketResult] = await connection.execute(
      `
        INSERT INTO tickets_suporte
          (usuario_id, categoria, assunto, descricao, status, prioridade)
        VALUES (?, ?, ?, ?, 'open', ?)
      `,
      [userId, payload.category, payload.subject, payload.description, payload.priority],
    );

    await connection.execute(
      `
        INSERT INTO interacoes_suporte
          (ticket_id, autor_id, mensagem)
        VALUES (?, ?, ?)
      `,
      [ticketResult.insertId, userId, payload.description],
    );

    await connection.commit();

    return getTicketDetails(userId, ticketResult.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function addTicketMessage(userId, ticketId, payload) {
  const ticket = await getTicketOwnedByUser(userId, ticketId);

  if (!ticket) {
    throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket de suporte não encontrado.");
  }

  if (ticket.status === "closed") {
    throw new ApiError(409, "TICKET_CLOSED", "Este ticket já foi encerrado e não aceita novas mensagens.");
  }

  await db.execute(
    `
      INSERT INTO interacoes_suporte
        (ticket_id, autor_id, mensagem)
      VALUES (?, ?, ?)
    `,
    [ticketId, userId, payload.message],
  );

  await db.execute(
    `
      UPDATE tickets_suporte
      SET status = CASE WHEN status = 'resolved' THEN 'in_progress' ELSE status END,
          atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [ticketId],
  );

  return getTicketDetails(userId, ticketId);
}

module.exports = {
  addTicketMessage,
  createTicket,
  getTicketDetails,
  listUserTickets,
};