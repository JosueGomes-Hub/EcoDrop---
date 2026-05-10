const db = require("../config/db");

const ApiError = require("../utils/apiError");
const { getLevelMeta } = require("../utils/gamification");

function generateRedemptionCode() {
  const randomChunk = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `VV-${Date.now().toString(36).toUpperCase()}-${randomChunk}`;
}

async function getUserWalletForUpdate(connection, userId) {
  const [rows] = await connection.execute(
    `
      SELECT id, saldo, status
      FROM usuarios
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [userId],
  );

  return rows[0] ?? null;
}

async function createWalletTransaction(connection, payload) {
  const [result] = await connection.execute(
    `
      INSERT INTO transacoes_carteira
        (usuario_id, tipo, origem, referencia_id, valor, saldo_resultante, descricao)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.userId,
      payload.type,
      payload.origin,
      payload.referenceId,
      payload.value,
      payload.balanceAfter,
      payload.description,
    ],
  );

  return result.insertId;
}

async function getBenefitForRedemption(connection, benefitId) {
  const [rows] = await connection.execute(
    `
      SELECT
        b.id,
        b.parceiro_id,
        b.titulo,
        b.descricao,
        b.tipo,
        b.custo_voucher,
        b.valor_desconto,
        b.limite_periodo,
        p.nome AS parceiro_nome,
        p.logo_emoji
      FROM beneficios_parceiro b
      INNER JOIN parceiros p ON p.id = b.parceiro_id
      WHERE b.id = ?
        AND b.status = 'active'
        AND p.status = 'active'
      LIMIT 1
      FOR UPDATE
    `,
    [benefitId],
  );

  return rows[0] ?? null;
}

async function getWalletSummary(userId) {
  const [rows] = await db.execute(
    `
      SELECT
        u.id,
        u.saldo,
        u.xp_total,
        COALESCE(SUM(CASE WHEN t.valor > 0 THEN t.valor ELSE 0 END), 0) AS total_creditado,
        COALESCE(SUM(CASE WHEN t.valor < 0 THEN ABS(t.valor) ELSE 0 END), 0) AS total_resgatado
      FROM usuarios u
      LEFT JOIN transacoes_carteira t ON t.usuario_id = u.id
      WHERE u.id = ?
      GROUP BY u.id
      LIMIT 1
    `,
    [userId],
  );

  const wallet = rows[0];

  if (!wallet) {
    throw new ApiError(404, "USER_NOT_FOUND", "Usuário não encontrado para a carteira.");
  }

  const levelMeta = getLevelMeta(wallet.xp_total);

  return {
    balance: Number(wallet.saldo || 0),
    totalCredited: Number(wallet.total_creditado || 0),
    totalRedeemed: Number(wallet.total_resgatado || 0),
    level: levelMeta.level,
    levelTitle: levelMeta.title,
    progressPercent: levelMeta.progressPercent,
    nextLevelXp: levelMeta.nextLevelXp,
    xpToNextLevel: levelMeta.xpToNextLevel,
  };
}

async function listTransactions(userId) {
  const [rows] = await db.execute(
    `
      SELECT
        id,
        tipo,
        origem,
        descricao,
        valor,
        saldo_resultante,
        created_at
      FROM transacoes_carteira
      WHERE usuario_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `,
    [userId],
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.tipo,
    origin: row.origem,
    description: row.descricao,
    value: Number(row.valor),
    balanceAfter: Number(row.saldo_resultante),
    createdAt: row.created_at,
  }));
}

async function listRedemptions(userId) {
  const [rows] = await db.execute(
    `
      SELECT
        r.id,
        r.codigo_resgate,
        r.valor_debitado,
        r.status,
        r.expira_em,
        r.utilizado_em,
        r.criado_em,
        p.nome AS parceiro_nome,
        b.titulo AS beneficio_titulo,
        b.tipo AS beneficio_tipo
      FROM resgates_voucher r
      INNER JOIN parceiros p ON p.id = r.parceiro_id
      INNER JOIN beneficios_parceiro b ON b.id = r.beneficio_id
      WHERE r.usuario_id = ?
      ORDER BY r.criado_em DESC
      LIMIT 20
    `,
    [userId],
  );

  return rows.map((row) => ({
    id: row.id,
    code: row.codigo_resgate,
    debitedValue: Number(row.valor_debitado),
    status: row.status,
    expiresAt: row.expira_em,
    usedAt: row.utilizado_em,
    createdAt: row.criado_em,
    partnerName: row.parceiro_nome,
    benefitTitle: row.beneficio_titulo,
    benefitType: row.beneficio_tipo,
  }));
}

async function redeemBenefit(userId, payload) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const user = await getUserWalletForUpdate(connection, userId);

    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "Usuário não encontrado para resgate.");
    }

    if (user.status !== "active") {
      throw new ApiError(403, "USER_BLOCKED", "Sua conta não está disponível para resgates.");
    }

    const benefit = await getBenefitForRedemption(connection, payload.benefitId);

    if (!benefit) {
      throw new ApiError(404, "BENEFIT_NOT_FOUND", "Benefício parceiro não encontrado.");
    }

    if (benefit.limite_periodo) {
      const [limitRows] = await connection.execute(
        `
          SELECT COUNT(*) AS total
          FROM resgates_voucher
          WHERE usuario_id = ?
            AND beneficio_id = ?
            AND criado_em >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
            AND status <> 'cancelled'
        `,
        [userId, benefit.id],
      );

      if (Number(limitRows[0]?.total || 0) >= Number(benefit.limite_periodo)) {
        throw new ApiError(409, "BENEFIT_LIMIT_REACHED", "Limite de resgates atingido para este benefício no período atual.");
      }
    }

    const currentBalance = Number(user.saldo || 0);
    const voucherCost = Number(benefit.custo_voucher);

    if (currentBalance < voucherCost) {
      throw new ApiError(409, "INSUFFICIENT_BALANCE", "Saldo insuficiente para resgatar este benefício.");
    }

    const nextBalance = Number((currentBalance - voucherCost).toFixed(2));
    const redemptionCode = generateRedemptionCode();
    const expirationDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    const [redemptionResult] = await connection.execute(
      `
        INSERT INTO resgates_voucher
          (usuario_id, beneficio_id, parceiro_id, valor_debitado, codigo_resgate, status, expira_em)
        VALUES (?, ?, ?, ?, ?, 'generated', ?)
      `,
      [userId, benefit.id, benefit.parceiro_id, voucherCost, redemptionCode, expirationDate],
    );

    await connection.execute(
      `
        UPDATE usuarios
        SET saldo = ?
        WHERE id = ?
      `,
      [nextBalance, userId],
    );

    await createWalletTransaction(connection, {
      userId,
      type: "debit",
      origin: "partner_redeem",
      referenceId: redemptionResult.insertId,
      value: voucherCost,
      balanceAfter: nextBalance,
      description: `Resgate: ${benefit.titulo} em ${benefit.parceiro_nome}`,
    });

    await connection.commit();

    return {
      redemption: {
        id: redemptionResult.insertId,
        code: redemptionCode,
        status: "generated",
        debitedValue: voucherCost,
        expiresAt: expirationDate,
        partnerName: benefit.parceiro_nome,
        partnerLogo: benefit.logo_emoji,
        benefitTitle: benefit.titulo,
        benefitType: benefit.tipo,
        discountValue: benefit.valor_desconto === null ? null : Number(benefit.valor_desconto),
      },
      wallet: await getWalletSummary(userId),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createWalletTransaction,
  getWalletSummary,
  getUserWalletForUpdate,
  listRedemptions,
  listTransactions,
  redeemBenefit,
};
