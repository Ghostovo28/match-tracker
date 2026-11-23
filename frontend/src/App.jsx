import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const EMPTY_FORM = {
  tournament_name: '',
  home_team: '',
  away_team: '',
  home_score: 0,
  away_score: 0,
  status: 'UPCOMING',
  match_date: '2026-11-28',
};

export default function App() {
  const [matches, setMatches] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  async function loadMatches() {
    try {
      setError('');
      const res = await fetch(`${API_URL}/matches`);
      if (!res.ok) throw new Error('Erreur de chargement des matchs');
      const data = await res.json();
      setMatches(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadMatches();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      const url = editingId ? `${API_URL}/matches/${editingId}` : `${API_URL}/matches`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Opération impossible');
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      await loadMatches();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(match) {
    setEditingId(match.id);
    setForm({
      tournament_name: match.tournament_name,
      home_team: match.home_team,
      away_team: match.away_team,
      home_score: match.home_score,
      away_score: match.away_score,
      status: match.status,
      match_date: match.match_date,
    });
  }

  async function handleDelete(id) {
    try {
      setError('');
      const res = await fetch(`${API_URL}/matches/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Suppression impossible');
      await loadMatches();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <h1>Gestion de Matchs & Tournois</h1>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
        <input
          placeholder="Nom du tournoi"
          value={form.tournament_name}
          onChange={(e) => setForm({ ...form, tournament_name: e.target.value })}
          required
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            placeholder="Équipe domicile"
            value={form.home_team}
            onChange={(e) => setForm({ ...form, home_team: e.target.value })}
            required
          />
          <input
            type="number"
            min="0"
            value={form.home_score}
            onChange={(e) => setForm({ ...form, home_score: Number(e.target.value) })}
            style={{ width: 80 }}
          />
          <span>-</span>
          <input
            type="number"
            min="0"
            value={form.away_score}
            onChange={(e) => setForm({ ...form, away_score: Number(e.target.value) })}
            style={{ width: 80 }}
          />
          <input
            placeholder="Équipe extérieure"
            value={form.away_team}
            onChange={(e) => setForm({ ...form, away_team: e.target.value })}
            required
          />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="UPCOMING">À venir</option>
            <option value="LIVE">En cours</option>
            <option value="FINISHED">Terminé</option>
          </select>
          <input
            type="date"
            value={form.match_date}
            onChange={(e) => setForm({ ...form, match_date: e.target.value })}
            required
          />
          <button type="submit">{editingId ? 'Mettre à jour' : 'Ajouter le match'}</button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <table border="1" cellPadding="8" cellSpacing="0" width="100%">
        <thead>
          <tr>
            <th>Tournoi</th>
            <th>Rencontre</th>
            <th>Score</th>
            <th>Statut</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <tr key={m.id}>
              <td>{m.tournament_name}</td>
              <td>{m.home_team} vs {m.away_team}</td>
              <td><strong>{m.home_score} - {m.away_score}</strong></td>
              <td>{m.status}</td>
              <td>{m.match_date}</td>
              <td>
                <button onClick={() => startEdit(m)}>Modifier</button>{' '}
                <button onClick={() => handleDelete(m.id)}>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
