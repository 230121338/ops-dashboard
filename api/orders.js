// api/orders.js
const { sql, ensureSchema } = require("./_lib/db");

module.exports = async (req, res) => {
  try {
    await ensureSchema();
    const limit = Math.min(Number(req.query.limit) || 15, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const status = req.query.status;

    const result = status
      ? await sql`
          SELECT o.id, c.name AS customer_name, p.name AS product_name,
                 o.quantity, o.total_cents, o.status, o.created_at
          FROM orders o
          JOIN customers c ON c.id = o.customer_id
          JOIN products p ON p.id = o.product_id
          WHERE o.status = ${status}
          ORDER BY o.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      : await sql`
          SELECT o.id, c.name AS customer_name, p.name AS product_name,
                 o.quantity, o.total_cents, o.status, o.created_at
          FROM orders o
          JOIN customers c ON c.id = o.customer_id
          JOIN products p ON p.id = o.product_id
          ORDER BY o.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;

    const totalResult = await sql`SELECT COUNT(*)::int AS c FROM orders`;

    res.status(200).json({
      rows: result.rows,
      total: totalResult.rows[0].c,
      limit,
      offset,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error", detail: String(err) });
  }
};
