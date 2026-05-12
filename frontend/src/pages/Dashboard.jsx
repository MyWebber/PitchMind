import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_LABELS = {
  watching: 'Observatie',
  shortlisted: 'Shortlist',
  signed: 'Getekend',
  rejected: 'Afgewezen',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/players/stats/summary')
      .then((r) => setStats(r.data))
      .catch(() => setError('Kon statistieken niet laden.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner spinner-lg" />
        <span>Dashboard laden...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">
            Hoi, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="page-header__sub">Hier is een overzicht van je scoutingactiviteit</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/upload" className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload dataset
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {stats && (
        <>
          {/* Stats grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card__label">Gescout</div>
              <div className="stat-card__value">{stats.totalScouted}</div>
              <div className="stat-card__sub">Spelers in lijst</div>
            </div>
            <div className="stat-card stat-card--amber">
              <div className="stat-card__label">Favorieten</div>
              <div className="stat-card__value stat-card__value">{stats.starred}</div>
              <div className="stat-card__sub">Gestemd met ster</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Observatie</div>
              <div className="stat-card__value">{stats.watching}</div>
              <div className="stat-card__sub">In de gaten</div>
            </div>
            <div className="stat-card stat-card--green">
              <div className="stat-card__label">Shortlist</div>
              <div className="stat-card__value">{stats.shortlisted}</div>
              <div className="stat-card__sub">Serieuze kandidaten</div>
            </div>
            <div className="stat-card stat-card--accent">
              <div className="stat-card__label">Datasets</div>
              <div className="stat-card__value">{stats.totalDatasets}</div>
              <div className="stat-card__sub">Geüpload</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Geanalyseerd</div>
              <div className="stat-card__value">{stats.totalAnalyzed}</div>
              <div className="stat-card__sub">Spelers via AI</div>
            </div>
            <div className="stat-card stat-card--purple">
              <div className="stat-card__label">Toptalenten</div>
              <div className="stat-card__value">{stats.topTalents}</div>
              <div className="stat-card__sub">Tier S &amp; A</div>
            </div>
          </div>

          {/* Recent scouted players */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent gescout</span>
              <Link to="/scouting" className="btn btn-ghost btn-sm">
                Alles bekijken →
              </Link>
            </div>
            {stats.recentPlayers.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
                <h3>Nog geen spelers gescout</h3>
                <p>Upload een dataset of voeg spelers handmatig toe</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Speler</th>
                      <th>Positie</th>
                      <th>Club</th>
                      <th>Status</th>
                      <th>Toegevoegd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentPlayers.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="td-name">{p.name}</div>
                          {p.nation && <div className="td-muted">{p.nation}</div>}
                        </td>
                        <td><span className="tag">{p.position || '—'}</span></td>
                        <td>{p.squad || '—'}</td>
                        <td>
                          <span className={`badge badge-${p.status}`}>
                            {STATUS_LABELS[p.status] || p.status}
                          </span>
                        </td>
                        <td className="td-muted">{formatDate(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick links */}
          {stats.totalDatasets === 0 && (
            <div className="card" style={{ marginTop: 14, textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                Begin door je eerste spelersdata te uploaden en laat de AI alles analyseren.
              </div>
              <Link to="/upload" className="btn btn-primary btn-lg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload eerste dataset
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
