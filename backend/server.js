import express from "express";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD || "apppass",
  database: process.env.DB_NAME || "appdb",
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items(
      id SERIAL PRIMARY KEY,
      text VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

app.get("/api/health", async (_, res) => {
  try { await pool.query("SELECT 1"); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get("/api/items", async (_, res) => {
  const r = await pool.query("SELECT id,text FROM items ORDER BY id DESC LIMIT 50;");
  res.json(r.rows);
});

app.post("/api/items", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "text required" });
  const r = await pool.query("INSERT INTO items(text) VALUES($1) RETURNING id,text;", [text]);
  res.status(201).json(r.rows[0]);
});

app.listen(3000, async () => {
  try { await init(); console.log("backend on 3000"); }
  catch (e) { console.error("db init fail:", e.message); }
});
