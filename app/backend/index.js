const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Conexão com o banco de dados
const db = new sqlite3.Database('./peliculas.db');

// Criação da tabela (roda uma vez só)
db.run(`
  CREATE TABLE IF NOT EXISTS peliculas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    modelo TEXT NOT NULL,
    compatibilidade TEXT NOT NULL
  )
`);

// Rota para obter todas as películas
app.get('/api/peliculas', (req, res) => {
  db.all('SELECT * FROM peliculas', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Rota para adicionar uma nova película
app.post('/api/peliculas', (req, res) => {
  const { modelo, compatibilidade } = req.body;
  db.run(
    'INSERT INTO peliculas (modelo, compatibilidade) VALUES (?, ?)',
    [modelo, compatibilidade],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, modelo, compatibilidade });
    }
  );
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
