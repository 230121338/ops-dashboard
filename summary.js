// api/summary.js
const { sql, ensureSchema, rangeToDays } = require("./_lib/db");

module.exports = async (req, res) => {
  try {
    await ensureSchema();
    const days = rangeToDays(req.query.range);

    const current = await sql`
      SELECT
        COUNT(*)::int AS order_count,
        COALESCE(SUM(total_cents), 0)::int AS revenue_cents,
        COUNT(DISTINCT customer_id)::int AS active_customers
      FROM orders
      WHERE created_at >= NOW() - make_interval(days => ${days})
        AND status = 'completed'
    `;

    const previous = await sql`
      SELECT
        COUNT(*)::int AS order_count,
        COALESCE(SUM(total_cents), 0)::int AS revenue_cents
      FROM orders
      WHERE created_at >= NOW() - make_interval(days => ${days * 2})
        AND created_at < NOW() - make_interval(days => ${days})
        AND status = 'completed'
    `;

    const cur = current.rows[0];
    const prev = previous.rows[0];

    const avgOrderValue = cur.order_count > 0
      ? Math.round(cur.revenue_cents / cur.order_count)
      : 0;

    const pctChange = (c, p) => {
      if (p === 0) return c > 0 ? 100 : 0;
      return Math.round(((c - p) / p) * 1000) / 10;
    };

    res.status(200).json({
      range_days: days,
      revenue_cents: cur.revenue_cents,
      order_count: cur.order_count,
      active_customers: cur.active_customers,
      avg_order_value_cents: avgOrderValue,
      revenue_change_pct: pctChange(cur.revenue_cents, prev.revenue_cents),
      order_change_pct: pctChange(cur.order_count, prev.order_count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error", detail: String(err) });
  }
};
