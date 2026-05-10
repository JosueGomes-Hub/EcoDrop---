const db = require("../config/db");

async function listUserMissions(userId) {
  const [rows] = await db.execute(
    `
      SELECT
        m.id,
        m.slug,
        m.titulo,
        m.descricao,
        m.meta_quantidade,
        m.recompensa_tipo,
        m.recompensa_valor,
        m.inicio_em,
        m.fim_em,
        m.status,
        COALESCE(mu.progresso_atual, 0) AS progresso_atual,
        COALESCE(mu.status, 'active') AS progresso_status
      FROM missoes m
      LEFT JOIN missoes_usuario mu
        ON mu.missao_id = m.id
       AND mu.usuario_id = ?
      WHERE m.status = 'active'
      ORDER BY m.fim_em ASC, m.titulo ASC
    `,
    [userId],
  );

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.titulo,
    description: row.descricao,
    targetQuantity: Number(row.meta_quantidade),
    rewardType: row.recompensa_tipo,
    rewardValue: Number(row.recompensa_valor),
    startsAt: row.inicio_em,
    endsAt: row.fim_em,
    status: row.progresso_status,
    progress: Number(row.progresso_atual),
  }));
}

function getMissionIncrement(mission, items) {
  if (mission.tipo === "monthly_goal") {
    return items.reduce((total, item) => total + Number(item.quantidade || 0), 0);
  }

  const matchingItems = items.filter((item) => item.material_id === mission.material_id);

  if (!matchingItems.length) {
    return 0;
  }

  return matchingItems.reduce((total, item) => total + Number(item.quantidade || 0), 0);
}

async function applyDeliveryToMissions(connection, userId, deliveryItems) {
  const [missions] = await connection.execute(
    `
      SELECT
        id,
        slug,
        titulo,
        tipo,
        material_id,
        meta_quantidade,
        recompensa_tipo,
        recompensa_valor
      FROM missoes
      WHERE status = 'active'
        AND CURDATE() BETWEEN inicio_em AND fim_em
    `,
  );

  const rewards = [];

  for (const mission of missions) {
    const increment = getMissionIncrement(mission, deliveryItems);

    if (increment <= 0) {
      continue;
    }

    const [progressRows] = await connection.execute(
      `
        SELECT id, progresso_atual, status, recompensa_creditada_em
        FROM missoes_usuario
        WHERE missao_id = ? AND usuario_id = ?
        LIMIT 1
      `,
      [mission.id, userId],
    );

    const progressRow = progressRows[0] ?? null;
    const currentProgress = Number(progressRow?.progresso_atual || 0);
    const nextProgress = Number((currentProgress + increment).toFixed(2));
    const completedNow = (progressRow?.status !== "completed") && nextProgress >= Number(mission.meta_quantidade);
    const nextStatus = completedNow ? "completed" : (progressRow?.status || "active");

    if (progressRow) {
      await connection.execute(
        `
          UPDATE missoes_usuario
          SET progresso_atual = ?,
              status = ?,
              concluida_em = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE concluida_em END,
              recompensa_creditada_em = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE recompensa_creditada_em END
          WHERE id = ?
        `,
        [
          nextProgress,
          nextStatus,
          completedNow,
          completedNow && !progressRow.recompensa_creditada_em,
          progressRow.id,
        ],
      );
    } else {
      await connection.execute(
        `
          INSERT INTO missoes_usuario
            (missao_id, usuario_id, progresso_atual, status, concluida_em, recompensa_creditada_em)
          VALUES (?, ?, ?, ?, CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END, CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END)
        `,
        [
          mission.id,
          userId,
          nextProgress,
          nextStatus,
          completedNow,
          completedNow,
        ],
      );
    }

    if (completedNow) {
      rewards.push({
        missionId: mission.id,
        title: mission.titulo,
        rewardType: mission.recompensa_tipo,
        rewardValue: Number(mission.recompensa_valor),
      });
    }
  }

  return { rewards };
}

module.exports = {
  applyDeliveryToMissions,
  listUserMissions,
};
