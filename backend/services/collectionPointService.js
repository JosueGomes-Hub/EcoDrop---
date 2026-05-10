const db = require("../config/db");

async function listCollectionPoints(filters = {}) {
  const params = [];
  const where = ["pc.status = 'active'"];

  if (filters.city) {
    where.push("pc.cidade = ?");
    params.push(filters.city);
  }

  if (filters.material) {
    where.push(`
      EXISTS (
        SELECT 1
        FROM ponto_materiais pmf
        INNER JOIN materiais mf ON mf.id = pmf.material_id
        WHERE pmf.ponto_id = pc.id
          AND pmf.status = 'active'
          AND mf.slug = ?
      )
    `);
    params.push(filters.material);
  }

  const [rows] = await db.execute(
    `
      SELECT
        pc.id,
        pc.nome,
        pc.slug,
        pc.descricao,
        pc.endereco,
        pc.bairro,
        pc.cidade,
        pc.estado,
        pc.distancia_km,
        pc.abre_as,
        pc.fecha_as,
        GROUP_CONCAT(DISTINCT m.nome ORDER BY m.nome SEPARATOR '||') AS materiais,
        GROUP_CONCAT(
          DISTINCT CONCAT_WS(
            '::',
            m.id,
            m.nome,
            m.slug,
            m.unidade,
            m.pontos_por_unidade,
            m.valor_por_unidade
          )
          ORDER BY m.nome SEPARATOR '||'
        ) AS materiais_detalhados
      FROM pontos_coleta pc
      LEFT JOIN ponto_materiais pm ON pm.ponto_id = pc.id AND pm.status = 'active'
      LEFT JOIN materiais m ON m.id = pm.material_id AND m.status = 'active'
      WHERE ${where.join(" AND ")}
      GROUP BY pc.id
      ORDER BY pc.distancia_km ASC, pc.nome ASC
    `,
    params,
  );

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.nome,
    description: row.descricao,
    address: row.endereco,
    neighborhood: row.bairro,
    city: row.cidade,
    state: row.estado,
    distanceKm: row.distancia_km === null ? null : Number(row.distancia_km),
    opensAt: row.abre_as,
    closesAt: row.fecha_as,
    materials: row.materiais ? row.materiais.split("||") : [],
    materialOptions: row.materiais_detalhados
      ? row.materiais_detalhados.split("||").map((material) => {
          const [id, name, slug, unit, pointsPerUnit, valuePerUnit] = material.split("::");

          return {
            id: Number(id),
            name,
            slug,
            unit,
            pointsPerUnit: Number(pointsPerUnit),
            valuePerUnit: Number(valuePerUnit),
          };
        })
      : [],
  }));
}

module.exports = {
  listCollectionPoints,
};
