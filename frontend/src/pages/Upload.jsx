import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function handleFile(f) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Alleen CSV-bestanden zijn toegestaan.');
      return;
    }
    setError('');
    setResult(null);
    setFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setError('');
    setUploading(true);
    setProgress(10);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setProgress(40);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / e.total) * 50) + 40;
          setProgress(Math.min(pct, 85));
        },
      });
      setProgress(100);
      setResult(res.data);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload mislukt.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Dataset uploaden</h1>
          <p className="page-header__sub">Upload een CSV met spelersdata voor AI-analyse</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {result ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 8 }}>
            Analyse voltooid!
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
            {result.rowCount} spelers verwerkt — {result.topTalents} toptalenten gevonden (Tier S/A)
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={`/datasets/${result.datasetId}`} className="btn btn-primary btn-lg">
              Resultaten bekijken
            </Link>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => { setResult(null); setProgress(0); }}
            >
              Nieuwe upload
            </button>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 560 }}>
          {/* Drop zone */}
          <div
            className={`upload-zone${drag ? ' upload-zone--drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {file ? (
              <>
                <div className="upload-zone__title">{file.name}</div>
                <div className="upload-zone__sub">
                  {(file.size / 1024).toFixed(1)} KB — klik om te wijzigen
                </div>
              </>
            ) : (
              <>
                <div className="upload-zone__title">Sleep een CSV-bestand hier</div>
                <div className="upload-zone__sub">of klik om te bladeren · max. 20 MB</div>
              </>
            )}
          </div>

          {/* Progress */}
          {uploading && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                <span>Analyseren...</span>
                <span>{progress}%</span>
              </div>
              <div className="progress">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Upload button */}
          <button
            className="btn btn-primary btn-lg"
            style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? <span className="spinner" /> : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
            {uploading ? 'Bezig met analyseren...' : 'Uploaden & analyseren'}
          </button>

          {/* Info */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-title" style={{ marginBottom: 10 }}>Verwachte kolomnamen</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Player', 'Pos', 'Age', 'Squad', 'Comp', 'Nation', 'MP', 'Min', 'Gls', 'Ast', 'Sh', 'SoT', 'TklW', 'Int', 'Crs', 'Fld', 'CrdY', 'CrdR'].map((col) => (
                <span key={col} className="tag">{col}</span>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.6 }}>
              Kolommen zijn flexibel — de AI herkent ook alternatieve namen zoals <em>goals</em>, <em>assists</em>, <em>minutes</em>, etc.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
