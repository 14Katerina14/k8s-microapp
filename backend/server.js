import express from "express";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(express.json());


const DB_HOST = process.env.DB_HOST || "postgres";
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_USER = process.env.DB_USER || "appuser";
const DB_NAME = process.env.DB_NAME || "appdb";
const DB_PASSWORD = process.env.DB_PASSWORD; 

if (!DB_PASSWORD) {
  console.error("Missing DB_PASSWORD environment variable.");
  process.exit(1);
}

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
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

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message ?? "unknown error" });
  }
});

app.get("/api/items", async (_req, res) => {
  try {
    const r = await pool.query(
      "SELECT id, text, created_at FROM items ORDER BY id DESC LIMIT 50;"
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});

app.post("/api/items", async (req, res) => {
  const text = String(req.body?.text ?? "").trim();
  if (!text) return res.status(400).json({ error: "text required" });

  try {
    const r = await pool.query(
      "INSERT INTO items(text) VALUES($1) RETURNING id, text, created_at;",
      [text.slice(0, 255)]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, async () => {
  try {
    await init();
    console.log(`backend on ${PORT}`);
  } catch (e) {
    console.error("db init fail:", e?.message ?? e);
  }
});
