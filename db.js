// api/_lib/db.js
// Shared across every API function. `sql` is a tagged-template query
// function from @vercel/postgres — it auto-connects using the
// POSTGRES_URL env var that Vercel injects when you add a Postgres
// storage integration to your project.

const { sql } = require("@vercel/postgres");

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return; // avoid re-running this on every request in the same warm function
  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price_cents INTEGER NOT NULL
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      total_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);`;
  schemaReady = true;
}

function rangeToDays(range) {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  return 30;
}

module.exports = { sql, ensureSchema, rangeToDays };
