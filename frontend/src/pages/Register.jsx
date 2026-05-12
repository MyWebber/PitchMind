import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', club: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens bevatten.');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.club);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registratie mislukt.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <svg viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="15" stroke="#3fb950" strokeWidth="2" />
            <path d="M16 6c-1.5 2.5-4 4.5-6.5 5.5l1 5 5.5 2 5.5-2 1-5C20 10.5 17.5 8.5 16 6z" fill="#3fb950" fillOpacity=".25" stroke="#3fb950" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="2" fill="#3fb950" />
          </svg>
          <span>PitchMind</span>
        </div>

        <h1 className="auth-title">Account aanmaken</h1>
        <p className="auth-subtitle">Start met scouten met AI</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Naam</label>
              <input
                className="form-input"
                type="text"
                placeholder="Jan de Vries"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Club (optioneel)</label>
              <input
                className="form-input"
                type="text"
                placeholder="AFC Ajax"
                value={form.club}
                onChange={(e) => setForm({ ...form, club: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">E-mailadres</label>
            <input
              className="form-input"
              type="email"
              placeholder="jouw@email.nl"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Wachtwoord</label>
            <input
              className="form-input"
              type="password"
              placeholder="Minimaal 6 tekens"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Bezig...' : 'Account aanmaken'}
          </button>
        </form>

        <p className="auth-footer">
          Al een account?{' '}
          <Link to="/login" className="auth-link">Log hier in</Link>
        </p>
      </div>
    </div>
  );
}
