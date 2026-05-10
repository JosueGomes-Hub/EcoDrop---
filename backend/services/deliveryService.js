const db = require("../config/db");

const ApiError = require("../utils/apiError");
const missionService = require("./missionService");
const walletService = require("./walletService");

function buildDeliveryProtocol() {
  const randomChunk = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ECO-${Date.now().toString(36).toUpperCase()}-${randomChunk}`;
}

async function resolvePointBySlug(connection, slug) {
  const [rows] = await connection.execute(
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

async function getUserForDeliveryUpdate(connection, userId) {
  const [rows] = await connection.execute(
    `
      SELECT id, saldo, xp_total, status
      FROM usuarios
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [userId],
  );

  return rows[0] ?? null;
}

async function resolveAppointment(connection, userId, appointmentId, pointId) {
  if (!appointmentId) {
    return null;
  }

  const [rows] = await connection.execute(
    `
      SELECT id, usuario_id, ponto_id, status
      FROM agendamentos
      WHERE id = ? AND usuario_id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [appointmentId, userId],
  );

  const appointment = rows[0] ?? null;

  if (!appointment) {
    throw new ApiError(404, "APPOINTMENT_NOT_FOUND", "Agendamento não encontrado para esta entrega.");
  }

  if (appointment.ponto_id !== pointId) {
    throw new ApiError(409, "APPOINTMENT_POINT_MISMATCH", "O agendamento não pertence ao ponto de coleta informado.");
  }

  if (["cancelled", "completed", "missed"].includes(appointment.status)) {
    throw new ApiError(409, "APPOINTMENT_NOT_AVAILABLE", "Este agendamento não está disponível para uma nova entrega.");
  }

  return appointment;
}

async function resolvePointMaterials(connection, pointId, materialSlugs) {
  const placeholders = materialSlugs.map(() => "?").join(", ");
  const [rows] = await connection.execute(
    `
      SELECT
        m.id,
        m.nome,
        m.slug,
        m.unidade,
        m.pontos_por_unidade,
        m.valor_por_unidade
      FROM ponto_materiais pm
      INNER JOIN materiais m ON m.id = pm.material_id
      WHERE pm.ponto_id = ?
        AND pm.status = 'active'
        AND m.status = 'active'
        AND m.slug IN (${placeholders})
    `,
    [pointId, ...materialSlugs],
  );

  return rows;
}

function mapItemsForInsert(items, materialsBySlug) {
  return items.map((item) => {
    const material = materialsBySlug.get(item.materialSlug);

    if (!material) {
      throw new ApiError(404, "MATERIAL_NOT_AVAILABLE", `O material ${item.materialSlug} não é aceito no ponto selecionado.`);
    }

    return {
      materialId: material.id,
      materialName: material.nome,
      materialSlug: material.slug,
      quantity: item.quantity,
      unit: material.unidade,
      generatedPoints: Math.round(item.quantity * Number(material.pontos_por_unidade)),
      creditedValue: Number((item.quantity * Number(material.valor_por_unidade)).toFixed(2)),
    };
  });
}

function groupDeliveryRows(rows) {
  const deliveries = new Map();

  rows.forEach((row) => {
    if (!deliveries.has(row.id)) {
      deliveries.set(row.id, {
        id: row.id,
        protocol: row.protocolo,
        status: row.status,
        userNotes: row.observacoes_usuario,
        operatorNotes: row.observacoes_operador,
        createdAt: row.criado_em,
        confirmedAt: row.confirmado_em,
        point: {
          id: row.ponto_id,
          slug: row.ponto_slug,
          name: row.ponto_nome,
          address: row.endereco,
        },
        appointmentId: row.agendamento_id,
        userId: row.usuario_id,
        userName: row.usuario_nome ? `${row.usuario_nome} ${row.usuario_sobrenome}`.trim() : null,
        items: [],
        totals: {
          points: 0,
          creditedValue: 0,
        },
      });
    }

    const delivery = deliveries.get(row.id);

    if (row.item_id) {
      const creditedValue = Number(row.valor_creditado || 0);
      const generatedPoints = Number(row.pontos_gerados || 0);

      delivery.items.push({
        id: row.item_id,
        materialId: row.material_id,
        materialName: row.material_nome,
        materialSlug: row.material_slug,
        quantity: Number(row.quantidade),
        unit: row.unidade,
        generatedPoints,
        creditedValue,
      });

      delivery.totals.points += generatedPoints;
      delivery.totals.creditedValue = Number((delivery.totals.creditedValue + creditedValue).toFixed(2));
    }
  });

  return Array.from(deliveries.values());
}

async function getDeliveryById(userId, deliveryId) {
  const [rows] = await db.execute(
    `
      SELECT
        d.id,
        d.usuario_id,
        d.ponto_id,
        d.agendamento_id,
        d.protocolo,
        d.status,
        d.observacoes_usuario,
        d.observacoes_operador,
        d.confirmado_em,
        d.criado_em,
        p.slug AS ponto_slug,
        p.nome AS ponto_nome,
        p.endereco,
        ei.id AS item_id,
        ei.material_id,
        ei.quantidade,
        ei.unidade,
        ei.pontos_gerados,
        ei.valor_creditado,
        m.nome AS material_nome,
        m.slug AS material_slug
      FROM entregas d
      INNER JOIN pontos_coleta p ON p.id = d.ponto_id
      LEFT JOIN entrega_itens ei ON ei.entrega_id = d.id
      LEFT JOIN materiais m ON m.id = ei.material_id
      WHERE d.id = ? AND d.usuario_id = ?
      ORDER BY ei.id ASC
    `,
    [deliveryId, userId],
  );

  const delivery = groupDeliveryRows(rows)[0] ?? null;

  if (!delivery) {
    throw new ApiError(404, "DELIVERY_NOT_FOUND", "Entrega não encontrada.");
  }

  return delivery;
}

async function createDelivery(userId, payload) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const point = await resolvePointBySlug(connection, payload.pointSlug);

    if (!point) {
      throw new ApiError(404, "POINT_NOT_FOUND", "Ponto de coleta não encontrado.");
    }

    const appointment = await resolveAppointment(connection, userId, payload.appointmentId, point.id);
    const materials = await resolvePointMaterials(connection, point.id, payload.items.map((item) => item.materialSlug));
    const materialsBySlug = new Map(materials.map((material) => [material.slug, material]));
    const itemsToInsert = mapItemsForInsert(payload.items, materialsBySlug);
    const protocol = buildDeliveryProtocol();

    const [deliveryResult] = await connection.execute(
      `
        INSERT INTO entregas
          (usuario_id, ponto_id, agendamento_id, protocolo, status, observacoes_usuario)
        VALUES (?, ?, ?, ?, 'pending_confirmation', ?)
      `,
      [userId, point.id, appointment?.id || null, protocol, payload.userNotes],
    );

    for (const item of itemsToInsert) {
      await connection.execute(
        `
          INSERT INTO entrega_itens
            (entrega_id, material_id, quantidade, unidade, pontos_gerados, valor_creditado)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          deliveryResult.insertId,
          item.materialId,
          item.quantity,
          item.unit,
          item.generatedPoints,
          item.creditedValue,
        ],
      );
    }

    if (appointment) {
      await connection.execute(
        `
          UPDATE agendamentos
          SET status = 'checked_in'
          WHERE id = ?
        `,
        [appointment.id],
      );
    }

    await connection.commit();

    return getDeliveryById(userId, deliveryResult.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listUserDeliveries(userId) {
  const [rows] = await db.execute(
    `
      SELECT
        d.id,
        d.usuario_id,
        d.ponto_id,
        d.agendamento_id,
        d.protocolo,
        d.status,
        d.observacoes_usuario,
        d.observacoes_operador,
        d.confirmado_em,
        d.criado_em,
        p.slug AS ponto_slug,
        p.nome AS ponto_nome,
        p.endereco,
        ei.id AS item_id,
        ei.material_id,
        ei.quantidade,
        ei.unidade,
        ei.pontos_gerados,
        ei.valor_creditado,
        m.nome AS material_nome,
        m.slug AS material_slug
      FROM entregas d
      INNER JOIN pontos_coleta p ON p.id = d.ponto_id
      LEFT JOIN entrega_itens ei ON ei.entrega_id = d.id
      LEFT JOIN materiais m ON m.id = ei.material_id
      WHERE d.usuario_id = ?
      ORDER BY d.criado_em DESC, ei.id ASC
    `,
    [userId],
  );

  return groupDeliveryRows(rows);
}

async function listPendingOperatorDeliveries(operatorUserId, role) {
  const params = [];
  const conditions = ["d.status = 'pending_confirmation'"];

  if (role !== "admin") {
    conditions.push(
      `EXISTS (
        SELECT 1
        FROM operadores_ponto op
        WHERE op.ponto_id = d.ponto_id
          AND op.usuario_id = ?
          AND op.status = 'active'
      )`,
    );
    params.push(operatorUserId);
  }

  const [rows] = await db.execute(
    `
      SELECT
        d.id,
        d.usuario_id,
        d.ponto_id,
        d.agendamento_id,
        d.protocolo,
        d.status,
        d.observacoes_usuario,
        d.observacoes_operador,
        d.confirmado_em,
        d.criado_em,
        p.slug AS ponto_slug,
        p.nome AS ponto_nome,
        p.endereco,
        u.nome AS usuario_nome,
        u.sobrenome AS usuario_sobrenome,
        ei.id AS item_id,
        ei.material_id,
        ei.quantidade,
        ei.unidade,
        ei.pontos_gerados,
        ei.valor_creditado,
        m.nome AS material_nome,
        m.slug AS material_slug
      FROM entregas d
      INNER JOIN pontos_coleta p ON p.id = d.ponto_id
      INNER JOIN usuarios u ON u.id = d.usuario_id
      LEFT JOIN entrega_itens ei ON ei.entrega_id = d.id
      LEFT JOIN materiais m ON m.id = ei.material_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY d.criado_em ASC, ei.id ASC
    `,
    params,
  );

  return groupDeliveryRows(rows);
}

async function ensureOperatorAccess(connection, operatorUserId, role, pointId) {
  if (role === "admin") {
    return;
  }

  const [rows] = await connection.execute(
    `
      SELECT id
      FROM operadores_ponto
      WHERE usuario_id = ?
        AND ponto_id = ?
        AND status = 'active'
      LIMIT 1
    `,
    [operatorUserId, pointId],
  );

  if (!rows[0]) {
    throw new ApiError(403, "FORBIDDEN", "Você não está vinculado a este ponto para revisar entregas.");
  }
}

async function reviewDelivery(operatorUserId, role, deliveryId, payload) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [deliveryRows] = await connection.execute(
      `
        SELECT id, usuario_id, ponto_id, agendamento_id, protocolo, status
        FROM entregas
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [deliveryId],
    );

    const delivery = deliveryRows[0] ?? null;

    if (!delivery) {
      throw new ApiError(404, "DELIVERY_NOT_FOUND", "Entrega não encontrada para revisão.");
    }

    if (delivery.status !== "pending_confirmation") {
      throw new ApiError(409, "DELIVERY_ALREADY_REVIEWED", "Esta entrega já foi revisada anteriormente.");
    }

    await ensureOperatorAccess(connection, operatorUserId, role, delivery.ponto_id);

    const [itemRows] = await connection.execute(
      `
        SELECT material_id, quantidade, pontos_gerados, valor_creditado
        FROM entrega_itens
        WHERE entrega_id = ?
      `,
      [deliveryId],
    );

    await connection.execute(
      `
        UPDATE entregas
        SET status = ?,
            observacoes_operador = ?,
            confirmado_por = ?,
            confirmado_em = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [payload.status, payload.operatorNotes, operatorUserId, deliveryId],
    );

    if (payload.status === "confirmed") {
      const baseCredit = itemRows.reduce((total, item) => total + Number(item.valor_creditado || 0), 0);
      const baseXp = itemRows.reduce((total, item) => total + Number(item.pontos_gerados || 0), 0);
      const user = await getUserForDeliveryUpdate(connection, delivery.usuario_id);

      if (!user || user.status !== "active") {
        throw new ApiError(404, "USER_NOT_FOUND", "Usuário da entrega não está disponível para crédito.");
      }

      let runningBalance = Number(user.saldo || 0);
      let runningXp = Number(user.xp_total || 0);

      runningBalance = Number((runningBalance + baseCredit).toFixed(2));
      runningXp += baseXp;

      await walletService.createWalletTransaction(connection, {
        userId: delivery.usuario_id,
        type: "credit",
        origin: "delivery",
        referenceId: deliveryId,
        value: Number(baseCredit.toFixed(2)),
        balanceAfter: runningBalance,
        description: `Entrega confirmada: ${delivery.protocolo}`,
      });

      const missionResult = await missionService.applyDeliveryToMissions(connection, delivery.usuario_id, itemRows);

      for (const reward of missionResult.rewards) {
        if (reward.rewardType === "voucher") {
          runningBalance = Number((runningBalance + reward.rewardValue).toFixed(2));

          await walletService.createWalletTransaction(connection, {
            userId: delivery.usuario_id,
            type: "bonus",
            origin: "mission",
            referenceId: reward.missionId,
            value: reward.rewardValue,
            balanceAfter: runningBalance,
            description: `Bônus de missão: ${reward.title}`,
          });
        }

        if (reward.rewardType === "xp") {
          runningXp += reward.rewardValue;
        }
      }

      await connection.execute(
        `
          UPDATE usuarios
          SET saldo = ?, xp_total = ?
          WHERE id = ?
        `,
        [runningBalance, runningXp, delivery.usuario_id],
      );

      if (delivery.agendamento_id) {
        await connection.execute(
          `
            UPDATE agendamentos
            SET status = 'completed'
            WHERE id = ?
          `,
          [delivery.agendamento_id],
        );
      }
    }

    await connection.commit();

    return listPendingOperatorDeliveries(operatorUserId, role);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createDelivery,
  listPendingOperatorDeliveries,
  listUserDeliveries,
  reviewDelivery,
};