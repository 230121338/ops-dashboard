// api/top-products.js
const { sql, ensureSchema, rangeToDays } = require("./_lib/db");

module.exports = async (req, res) => {
  try {
    await ensureSchema();
    const days = rangeToDays(req.query.range);
    const limit = Math.min(Number(req.query.limit) || 6, 20);

    const result = await sql`
      SELECT
        p.name,
        p.category,
        COALESCE(SUM(o.total_cents), 0)::int AS revenue_cents,
        COUNT(o.id)::int AS units_sold
      FROM products p
      LEFT JOIN orders o
        ON o.product_id = p.id
        AND o.created_at >= NOW() - make_interval(days => ${days})
        AND o.status = 'completed'
      GROUP BY p.id
      ORDER BY revenue_cents DESC
      LIMIT ${limit}
    `;

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error", detail: String(err) });
  }
};
