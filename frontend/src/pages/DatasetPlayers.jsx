import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

const TIERS = ['S', 'A', 'B', 'C', 'D'];
const POSITIONS = ['FW', 'MF', 'DF', 'GK'];

function TierBadge({ tier }) {
  return <span className={`tier tier-${tier}`}>{tier}</span>;
}

function ScoreBar({ score }) {
  const pct = Math.min(Math.max(score, 0), 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="score-bar"><div className="score-fill" style={{ width: `${pct}%` }} /></div>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 28 }}>{pct.toFixed(0)}</span>
    </div>
  );
}

export default function DatasetPlayers() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [filterPos, setFilterPos] = useState('');
  const [page, setPage] = useState(1);
  const [report, setReport] = useState(null); // { name, text }
  const [scouting, setScouting] = useState(null); // player id being added
  const [scoutedIds, setScoutedIds] = useState(new Set());

  const load = useCallback(() => {
    const params = new URLSearchParams({ page, limit: 50 });
    if (search) params.set('search', search);
    if (filterTier) params.set('tier', filterTier);
    if (filterPos) params.set('position', filterPos);

    api.get(`/datasets/${id}/players?${params}`)
      .then((r) => setData(r.data))
      .catch(() => setError('Kon spelers niet laden.'))
      .finally(() => setLoading(false));
  }, [id, page, search, filterTier, filterPos]);

  useEffect(() => { load(); }, [load]);

  async function addToScouting(player) {
    setScouting(player.id);
    try {
      await api.post('/players', {
        name: player.name,
        nation: player.nation,
        position: player.position,
        squad: player.squad,
        competition: player.competition,
        age: player.age,
        born: player.born,
        goals: player.goals,
        assists: player.assists,
        minutes: player.minutes,
        matches_played: player.matches_played,
        starts: player.starts,
        yellow_cards: player.yellow_cards,
        red_cards: player.red_cards,
        shots: player.shots,
        shots_on_target: player.shots_on_target,
        tackles_won: player.tackles_won,
        interceptions: player.interceptions,
        crosses: player.crosses,
        fouls_drawn: player.fouls_drawn,
        goals_per_90: player.goals_per_90,
        assists_per_90: player.assists_per_90,
        sot_percent: player.sot_percent,
        potential_score: player.potential_score,
        potential_tier: player.potential_tier,
        ai_report: player.ai_report,
        status: 'watching',
      });
      setScoutedIds((prev) => new Set(prev).add(player.id));
    } catch {
      // silently fail — player may already be scouted
    } finally {
      setScouting(null);
    }
  }

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner spinner-lg" />
        <span>Spelers laden...</span>
      </div>
    );
  }

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return null;

  const { dataset, players, total, pages } = data;

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title" style={{ wordBreak: 'break-all' }}>{dataset.original_name}</h1>
          <p className="page-header__sub">{total} speler{total !== 1 ? 's' : ''} · <Link to="/datasets" style={{ color: 'var(--accent)', textDecoration: 'none' }}>← Alle datasets</Link></p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          className="form-input"
          placeholder="Zoek op naam of club..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ maxWidth: 220 }}
        />
        <select className="form-select" value={filterTier} onChange={(e) => { setFilterTier(e.target.value); setPage(1); }}>
          <option value="">Alle tiers</option>
          {TIERS.map((t) => <option key={t} value={t}>Tier {t}</option>)}
        </select>
        <select className="form-select" value={filterPos} onChange={(e) => { setFilterPos(e.target.value); setPage(1); }}>
          <option value="">Alle posities</option>
          {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="filters-bar__spacer" />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} resultaten</span>
      </div>

      {players.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <h3>Geen spelers gevonden</h3>
          <p>Pas de filters aan</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Speler</th>
                  <th>Pos.</th>
                  <th>Club</th>
                  <th>Age</th>
                  <th>Tier</th>
                  <th>Score</th>
                  <th>Doelpunten</th>
                  <th>Assists</th>
                  <th>Min</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const added = scoutedIds.has(p.id);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="td-name">{p.name || '—'}</div>
                        {p.nation && <div className="td-muted">{p.nation}</div>}
                      </td>
                      <td><span className="tag">{p.position || '—'}</span></td>
                      <td style={{ fontSize: 12 }}>{p.squad || '—'}</td>
                      <td className="td-muted">{p.age ? p.age.toFixed(0) : '—'}</td>
                      <td><TierBadge tier={p.potential_tier || 'C'} /></td>
                      <td style={{ minWidth: 100 }}><ScoreBar score={p.potential_score} /></td>
                      <td className="td-muted">{p.goals ?? '—'}</td>
                      <td className="td-muted">{p.assists ?? '—'}</td>
                      <td className="td-muted">{p.minutes ?? '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {p.ai_report && (
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              title="AI rapport bekijken"
                              onClick={() => setReport({ name: p.name, text: p.ai_report })}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                            </button>
                          )}
                          <button
                            className={`btn btn-sm ${added ? 'btn-success' : 'btn-secondary'}`}
                            onClick={() => !added && addToScouting(p)}
                            disabled={added || scouting === p.id}
                            title={added ? 'Al gescout' : 'Toevoegen aan scouting'}
                          >
                            {scouting === p.id ? (
                              <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                            ) : added ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            )}
                            {added ? 'Gescout' : 'Scout'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
