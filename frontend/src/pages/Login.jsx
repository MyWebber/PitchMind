import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Inloggen mislukt.');
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

        <h1 className="auth-title">Welkom terug</h1>
        <p className="auth-subtitle">Log in op je scoutingaccount</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-mailadres</label>
            <input
              className="form-input"
              type="email"
              placeholder="jouw@email.nl"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Wachtwoord</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
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
            {loading ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>

        <p className="auth-footer">
          Nog geen account?{' '}
          <Link to="/register" className="auth-link">Registreer je hier</Link>
        </p>
      </div>
    </div>
  );
}
