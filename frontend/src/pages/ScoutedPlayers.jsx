import { useState, useEffect, useCallback } from 'react';
import api from '../api';

const STATUS_OPTIONS = [
  { value: 'watching', label: 'Observatie' },
  { value: 'shortlisted', label: 'Shortlist' },
  { value: 'signed', label: 'Getekend' },
  { value: 'rejected', label: 'Afgewezen' },
];

function TierBadge({ tier }) {
  if (!tier) return null;
  return <span className={`tier tier-${tier}`}>{tier}</span>;
}

function ScoreBar({ score }) {
  const pct = Math.min(Math.max(score || 0, 0), 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="score-bar"><div className="score-fill" style={{ width: `${pct}%` }} /></div>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 28 }}>{pct.toFixed(0)}</span>
    </div>
  );
}

export default function ScoutedPlayers() {
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [report, setReport] = useState(null);
  const [editing, setEditing] = useState(null); // { id, status, notes }
  const [saving, setSaving] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);

    api.get(`/players?${params}`)
      .then((r) => {
        setPlayers(r.data.players);
        setTotal(r.data.total);
        setPages(r.data.pages);
      })
      .catch(() => setError('Kon spelers niet laden.'))
      .finally(() => setLoading(false));
  }, [page, search, filterStatus]);

  useEffect(() => { load(); }, [load]);

  async function toggleStar(player) {
    const newVal = player.starred ? 0 : 1;
    setPlayers((prev) => prev.map((p) => p.id === player.id ? { ...p, starred: newVal } : p));
    await api.put(`/players/${player.id}`, { starred: newVal, status: player.status, notes: player.notes }).catch(() => load());
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(editing.id);
    try {
      const updated = await api.put(`/players/${editing.id}`, {
        status: editing.status,
        notes: editing.notes,
        starred: players.find((p) => p.id === editing.id)?.starred ?? 0,
      });
      setPlayers((prev) => prev.map((p) => p.id === editing.id ? updated.data : p));
      setEditing(null);
    } catch {
      setError('Opslaan mislukt.');
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Speler verwijderen uit je scoutinglijst?')) return;
    setDeleting(id);
    try {
      await api.delete(`/players/${id}`);
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      setTotal((t) => t - 1);
    } catch {
      setError('Verwijderen mislukt.');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Mijn Scouting</h1>
          <p className="page-header__sub">{total} gescout{total !== 1 ? 'e' : 'e'} speler{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-bar">
        <input
          className="form-input"
          placeholder="Zoek op naam, club of positie..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ maxWidth: 240 }}
        />
        <select className="form-select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">Alle statussen</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <span className="filters-bar__spacer" />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} resultaten</span>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner spinner-lg" /></div>
      ) : players.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          <h3>Geen spelers gevonden</h3>
          <p>{filterStatus || search ? 'Pas de filters aan' : 'Voeg spelers toe via een geüploade dataset'}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Speler</th>
                  <th>Pos.</th>
                  <th>Club</th>
                  <th>Tier</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Notities</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    {/* Star */}
                    <td style={{ width: 32 }}>
                      <button
                        className={`star-btn${p.starred ? ' star-btn--on' : ''}`}
                        onClick={() => toggleStar(p)}
                        title={p.starred ? 'Ster verwijderen' : 'Markeren als favoriet'}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    </td>
                    <td>
                      <div className="td-name">{p.name}</div>
                      {p.nation && <div className="td-muted">{p.nation}{p.age ? ` · ${parseFloat(p.age).toFixed(0)}j` : ''}</div>}
                    </td>
                    <td><span className="tag">{p.position || '—'}</span></td>
                    <td style={{ fontSize: 12 }}>{p.squad || '—'}</td>
                    <td><TierBadge tier={p.potential_tier} /></td>
                    <td style={{ minWidth: 100 }}><ScoreBar score={p.potential_score} /></td>
                    <td>
                      {editing?.id === p.id ? (
                        <select
                          className="form-select"
                          style={{ minWidth: 120 }}
                          value={editing.status}
                          onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                        >
                          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      ) : (
                        <span className={`badge badge-${p.status}`}>
                          {STATUS_OPTIONS.find((s) => s.value === p.status)?.label || p.status}
                        </span>
                      )}
                    </td>
                    <td style={{ maxWidth: 160 }}>
                      {editing?.id === p.id ? (
                        <input
                          className="form-input"
                          value={editing.notes}
                          onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                          placeholder="Notitie..."
                        />
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.notes || '—'}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {p.ai_report && (
                          <button className="btn btn-ghost btn-sm btn-icon" title="AI rapport" onClick={() => setReport({ name: p.name, text: p.ai_report })}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                          </button>
                        )}
                        {editing?.id === p.id ? (
                          <>
                            <button className="btn btn-success btn-sm" onClick={saveEdit} disabled={saving === p.id}>
                              {saving === p.id ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : 'Opslaan'}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Annuleer</button>
                          </>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Bewerken"
                            onClick={() => setEditing({ id: p.id, status: p.status, notes: p.notes || '' })}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          title="Verwijderen"
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}
                        >
                          {deleting === p.id ? (
                            <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="pagination">
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹ Vorige</button>
              <span className="pagination__info">Pagina {page} van {pages}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page === pages}>Volgende ›</button>
            </div>
          )}
        </div>
      )}

      {/* AI Report Modal */}
      {report && (
        <div className="modal-backdrop" onClick={() => setReport(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>AI Rapport — {report.name}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setReport(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="report-text">{report.text}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
