const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'devops_user',
  password: process.env.DB_PASSWORD || 'devops_pass',
  database: process.env.DB_NAME || 'match_tracker_db',
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      tournament_name VARCHAR(120) NOT NULL,
      home_team VARCHAR(80) NOT NULL,
      away_team VARCHAR(80) NOT NULL,
      home_score INT NOT NULL DEFAULT 0,
      away_score INT NOT NULL DEFAULT 0,
      status VARCHAR(30) NOT NULL DEFAULT 'UPCOMING',
      match_date VARCHAR(40) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM matches');
  if (rows[0].count === 0) {
    await pool.query(`
      INSERT INTO matches (tournament_name, home_team, away_team, home_score, away_score, status, match_date)
      VALUES
        ('Coupe DevOps 2026', 'Stade Tunis', 'Gafsa United', 2, 1, 'FINISHED', '2026-11-20'),
        ('Ligue d''Hiver', 'Raoued XI', 'Ariana Rovers', 1, 1, 'LIVE', '2026-11-23');
    `);
  }
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', details: err.message });
  }
});

// READ all matches
app.get('/api/matches', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM matches ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE match
app.post('/api/matches', async (req, res) => {
  const {
    tournament_name,
    home_team,
    away_team,
    home_score = 0,
    away_score = 0,
    status = 'UPCOMING',
    match_date,
  } = req.body;

  if (!tournament_name || !home_team || !away_team || !match_date) {
    return res.status(400).json({ error: 'Champs obligatoires manquants.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO matches (tournament_name, home_team, away_team, home_score, away_score, status, match_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [tournament_name, home_team, away_team, Number(home_score), Number(away_score), status, match_date]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE match
app.put('/api/matches/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { tournament_name, home_team, away_team, home_score, away_score, status, match_date } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE matches
       SET tournament_name = COALESCE($1, tournament_name),
           home_team = COALESCE($2, home_team),
           away_team = COALESCE($3, away_team),
           home_score = COALESCE($4, home_score),
           away_score = COALESCE($5, away_score),
           status = COALESCE($6, status),
           match_date = COALESCE($7, match_date)
       WHERE id = $8
       RETURNING *`,
      [
        tournament_name ?? null,
        home_team ?? null,
        away_team ?? null,
        home_score !== undefined ? Number(home_score) : null,
        away_score !== undefined ? Number(away_score) : null,
        status ?? null,
        match_date ?? null,
        id,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Match introuvable.' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE match
app.delete('/api/matches/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { rowCount } = await pool.query('DELETE FROM matches WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Match introuvable.' });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend API listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database init error:', err);
    process.exit(1);
  });
