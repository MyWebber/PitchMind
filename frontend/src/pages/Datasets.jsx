import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Datasets() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    api.get('/datasets')
      .then((r) => setDatasets(r.data))
      .catch(() => setError('Kon datasets niet laden.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!confirm('Dataset definitief verwijderen inclusief alle spelerdata?')) return;
    setDeleting(id);
    try {
      await api.delete(`/datasets/${id}`);
      setDatasets((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError('Verwijderen mislukt.');
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner spinner-lg" />
        <span>Datasets laden...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Datasets</h1>
          <p className="page-header__sub">{datasets.length} geüploade dataset{datasets.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/upload" className="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Nieuwe upload
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {datasets.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          <h3>Nog geen datasets</h3>
          <p>Upload een CSV-bestand om te beginnen met AI-analyse</p>
          <Link to="/upload" className="btn btn-primary" style={{ marginTop: 16 }}>Dataset uploaden</Link>
        </div>
      ) : (
        <div className="dataset-grid">
          {datasets.map((d) => (
            <div key={d.id} style={{ position: 'relative' }}>
              <Link to={`/datasets/${d.id}`} className="dataset-card">
                <div className="dataset-card__name">{d.original_name}</div>
                <div className="dataset-card__meta">
                  <span className="dataset-card__meta-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                    {d.row_count} spelers
                  </span>
                  <span className="dataset-card__meta-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    {formatDate(d.created_at)}
                  </span>
                  {d.analyzed ? (
                    <span className="badge badge-success">Geanalyseerd</span>
                  ) : (
                    <span className="badge badge-warning">In wachtrij</span>
                  )}
                </div>
              </Link>
              <button
                className="btn btn-danger btn-sm btn-icon"
                style={{ position: 'absolute', top: 12, right: 12 }}
                onClick={() => handleDelete(d.id)}
                disabled={deleting === d.id}
                title="Dataset verwijderen"
              >
                {deleting === d.id ? (
                  <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
