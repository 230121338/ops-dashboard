// api/seed.js
// Visit this URL once from any browser (including your phone) to populate
// the database with sample data:
//
//   https://<your-app>.vercel.app/api/seed?secret=YOUR_SEED_SECRET
//
// The secret must match the SEED_SECRET environment variable you set in
// Vercel — this stops random visitors from wiping/reseeding your data.
// Re-running it clears and regenerates the sample data, so it's safe to
// hit more than once.

const { sql, ensureSchema } = require("./_lib/db");

const PRODUCTS = [
  ["Nimbus Keyboard", "Hardware", 8900],
  ["Nimbus Mouse", "Hardware", 4500],
  ["Orbit Monitor 27\"", "Hardware", 32900],
  ["Flowstate Pro License", "Software", 12000],
  ["Flowstate Team License", "Software", 45000],
  ["Cable Organizer Kit", "Accessories", 1500],
  ["Desk Mat XL", "Accessories", 2900],
  ["Onboarding Session", "Services", 15000],
  ["Priority Support Plan", "Services", 9900],
  ["USB-C Dock", "Hardware", 6900],
];

const FIRST = ["Amara", "Liam", "Sofia", "Noah", "Yuki", "Ella", "Kofi", "Mia", "Diego", "Priya", "Jonas", "Zara", "Tariq", "Nora", "Ivan"];
const LAST = ["Reyes", "Chen", "Okafor", "Fischer", "Novak", "Larsen", "Silva", "Kapoor", "Moreau", "Adeyemi"];
const STATUSES = ["completed", "completed", "completed", "completed", "refunded", "pending"];

function rand(n) { return Math.floor(Math.random() * n); }
function pick(arr) { return arr[rand(arr.length)]; }

// weighted day offset: more recent days are more likely, for a mild upward trend
function weightedDayOffset(maxDays) {
  const raw = Math.random() * Math.random(); // skews toward 0
  return Math.floor(raw * maxDays);
}

async function chunkedInsert(items, fn, chunkSize = 25) {
  let count = 0;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.all(chunk.map(fn));
    count += chunk.length;
  }
  return count;
}

module.exports = async (req, res) => {
  if (!process.env.SEED_SECRET || req.query.secret !== process.env.SEED_SECRET) {
    return res.status(401).json({ error: "Unauthorized. Pass ?secret=YOUR_SEED_SECRET." });
  }

  try {
    await ensureSchema();

    await sql`DELETE FROM orders`;
    await sql`DELETE FROM products`;
    await sql`DELETE FROM customers`;

    // products
    const productRows = [];
    for (const [name, category, price] of PRODUCTS) {
      const r = await sql`
        INSERT INTO products (name, category, price_cents)
        VALUES (${name}, ${category}, ${price})
        RETURNING id
      `;
      productRows.push({ id: r.rows[0].id, price });
    }

    // customers (60, inserted concurrently in small batches)
    const customerSpecs = Array.from({ length: 60 }, () => {
      const first = pick(FIRST);
      const last = pick(LAST);
      return { first, last, daysAgo: rand(180) };
    });
    const usedEmails = new Set();
    const customerIds = [];
    await chunkedInsert(customerSpecs, async (spec) => {
      let email = `${spec.first.toLowerCase()}.${spec.last.toLowerCase()}@example.com`;
      while (usedEmails.has(email)) {
        email = `${spec.first.toLowerCase()}.${spec.last.toLowerCase()}${rand(999)}@example.com`;
      }
      usedEmails.add(email);
      const r = await sql`
        INSERT INTO customers (name, email, created_at)
        VALUES (${spec.first + " " + spec.last}, ${email}, NOW() - make_interval(days => ${spec.daysAgo}))
        RETURNING id
      `;
      customerIds.push(r.rows[0].id);
    });

    // orders (250, inserted concurrently in small batches)
    const orderSpecs = Array.from({ length: 250 }, () => {
      const product = pick(productRows);
      const quantity = 1 + rand(3);
      return {
        customerId: pick(customerIds),
        productId: product.id,
        quantity,
        total: product.price * quantity,
        status: pick(STATUSES),
        dayOffset: weightedDayOffset(90),
      };
    });
    const orderCount = await chunkedInsert(orderSpecs, (o) => sql`
      INSERT INTO orders (customer_id, product_id, quantity, total_cents, status, created_at)
      VALUES (${o.customerId}, ${o.productId}, ${o.quantity}, ${o.total}, ${o.status}, NOW() - make_interval(days => ${o.dayOffset}))
    `);

    res.status(200).json({
      ok: true,
      customers: customerIds.length,
      products: productRows.length,
      orders: orderCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error", detail: String(err) });
  }
};
