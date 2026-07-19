// public/js/app.js
// Fetches data from the Express API and renders it. No build step —
// plain fetch + Chart.js, so it's easy to trace end to end.

const state = { range: "30d" };

let revenueChart, productsChart;

function formatCurrency(cents) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatDate(isoString) {
  const d = new Date(isoString.replace(" ", "T") + "Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${url}`);
  return res.json();
}

function renderKPIs(summary) {
  const cards = [
    {
      label: "Revenue",
      value: formatCurrency(summary.revenue_cents),
      delta: summary.revenue_change_pct,
    },
    {
      label: "Orders",
      value: summary.order_count.toLocaleString(),
      delta: summary.order_change_pct,
    },
    {
      label: "Active customers",
      value: summary.active_customers.toLocaleString(),
      delta: null,
    },
    {
      label: "Avg order value",
      value: formatCurrency(summary.avg_order_value_cents),
      delta: null,
    },
  ];

  const row = document.getElementById("kpi-row");
  row.innerHTML = cards.map(c => `
    <div class="kpi-card">
      <div class="kpi-label">${c.label}</div>
      <div class="kpi-value">${c.value}</div>
      ${c.delta !== null ? `
        <span class="kpi-delta ${c.delta >= 0 ? "up" : "down"}">
          ${c.delta >= 0 ? "▲" : "▼"} ${Math.abs(c.delta)}% vs prior period
        </span>` : ""
      }
    </div>
  `).join("");
}

function renderRevenueChart(rows) {
  const ctx = document.getElementById("revenue-chart");
  const labels = rows.map(r => formatDate(r.day));
  const data = rows.map(r => r.revenue_cents / 100);

  if (revenueChart) revenueChart.destroy();
  revenueChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data,
        borderColor: "#e8a33d",
        backgroundColor: "rgba(232,163,61,0.10)",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: (ctx) => `$${ctx.parsed.y.toLocaleString()}` }
      }},
      scales: {
        x: { grid: { display: false }, ticks: { color: "#8891a3", font: { family: "JetBrains Mono", size: 10 } } },
        y: { grid: { color: "#1e232e" }, ticks: { color: "#8891a3", font: { family: "JetBrains Mono", size: 10 },
          callback: (v) => `$${v}` } },
      },
    },
  });
}

function renderProductsChart(rows) {
  const ctx = document.getElementById("products-chart");
  const labels = rows.map(r => r.name);
  const data = rows.map(r => r.revenue_cents / 100);

  if (productsChart) productsChart.destroy();
  productsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: "rgba(63,191,159,0.55)",
        borderRadius: 4,
        maxBarThickness: 22,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: (ctx) => `$${ctx.parsed.x.toLocaleString()}` }
      }},
      scales: {
        x: { grid: { color: "#1e232e" }, ticks: { color: "#8891a3", font: { family: "JetBrains Mono", size: 10 } } },
        y: { grid: { display: false }, ticks: { color: "#e9ebf1", font: { family: "Inter", size: 11.5 } } },
      },
    },
  });
}

function renderOrdersTable(payload) {
  const body = document.getElementById("orders-body");
  document.getElementById("orders-count-label").textContent = `${payload.total} total`;

  body.innerHTML = payload.rows.map(o => `
    <tr>
      <td>#${o.id}</td>
      <td style="font-family: var(--font-body);">${o.customer_name}</td>
      <td style="font-family: var(--font-body);">${o.product_name}</td>
      <td>${o.quantity}</td>
      <td>${formatCurrency(o.total_cents)}</td>
      <td><span class="status-badge ${o.status}">${o.status}</span></td>
      <td>${formatDate(o.created_at)}</td>
    </tr>
  `).join("");
}

async function loadAll() {
  document.getElementById("revenue-range-label").textContent =
    { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" }[state.range];

  const [summary, timeseries, topProducts, orders] = await Promise.all([
    fetchJSON(`/api/summary?range=${state.range}`),
    fetchJSON(`/api/revenue-timeseries?range=${state.range}`),
    fetchJSON(`/api/top-products?range=${state.range}&limit=6`),
    fetchJSON(`/api/orders?limit=12`),
  ]);

  renderKPIs(summary);
  renderRevenueChart(timeseries);
  renderProductsChart(topProducts);
  renderOrdersTable(orders);
}

document.querySelectorAll(".range-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".range-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.range = btn.dataset.range;
    loadAll().catch(console.error);
  });
});

loadAll().catch(err => {
  console.error(err);
  document.getElementById("kpi-row").innerHTML =
    `<div class="kpi-card">Couldn't load data. Is the server running and seeded?</div>`;
});
