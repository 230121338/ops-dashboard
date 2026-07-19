// api/revenue-timeseries.js
const { sql, ensureSchema, rangeToDays } = require("./_lib/db");

module.exports = async (req, res) => {
  try {
    await ensureSchema();
    const days = rangeToDays(req.query.range);

    const result = await sql`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM-DD') AS day,
        COALESCE(SUM(total_cents), 0)::int AS revenue_cents,
        COUNT(*)::int AS order_count
      FROM orders
      WHERE created_at >= NOW() - make_interval(days => ${days})
        AND status = 'completed'
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const byDay = Object.fromEntries(result.rows.map(r => [r.day, r]));
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({
        day: key,
        revenue_cents: byDay[key]?.revenue_cents ?? 0,
        order_count: byDay[key]?.order_count ?? 0,
      });
    }

    res.status(200).json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error", detail: String(err) });
  }
};
