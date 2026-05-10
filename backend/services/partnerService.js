const db = require("../config/db");

async function listPartners() {
  const [partners] = await db.execute(
    `
      SELECT id, nome, categoria, descricao, cidade, logo_emoji
      FROM parceiros
      WHERE status = 'active'
      ORDER BY categoria ASC, nome ASC
    `,
  );

  const [benefits] = await db.execute(
    `
      SELECT
        b.id,
        b.parceiro_id,
        b.titulo,
        b.descricao,
        b.tipo,
        b.custo_voucher,
        b.valor_desconto,
        b.limite_periodo
      FROM beneficios_parceiro b
      INNER JOIN parceiros p ON p.id = b.parceiro_id
      WHERE b.status = 'active'
        AND p.status = 'active'
      ORDER BY b.parceiro_id ASC, b.titulo ASC
    `,
  );

  return partners.map((partner) => ({
    id: partner.id,
    name: partner.nome,
    category: partner.categoria,
    description: partner.descricao,
    city: partner.cidade,
    logo: partner.logo_emoji,
    benefits: benefits
      .filter((benefit) => benefit.parceiro_id === partner.id)
      .map((benefit) => ({
        id: benefit.id,
        title: benefit.titulo,
        description: benefit.descricao,
        type: benefit.tipo,
        voucherCost: Number(benefit.custo_voucher),
        discountValue: benefit.valor_desconto === null ? null : Number(benefit.valor_desconto),
        periodLimit: benefit.limite_periodo,
      })),
  }));
}

module.exports = {
  listPartners,
};
