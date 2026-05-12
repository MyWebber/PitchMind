import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();

  const [profile, setProfile] = useState({ name: user?.name || '', club: user?.club || '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfileMsg(''); setProfileErr('');
    if (!profile.name.trim()) { setProfileErr('Naam is verplicht.'); return; }
    setSavingProfile(true);
    try {
      const res = await api.put('/auth/me', { name: profile.name.trim(), club: profile.club.trim() || null });
      updateUser(res.data);
      setProfileMsg('Profiel opgeslagen.');
    } catch (err) {
      setProfileErr(err.response?.data?.error || 'Opslaan mislukt.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePwSave(e) {
    e.preventDefault();
    setPwMsg(''); setPwErr('');
    if (pw.newPassword.length < 6) { setPwErr('Nieuw wachtwoord moet minimaal 6 tekens bevatten.'); return; }
    if (pw.newPassword !== pw.confirm) { setPwErr('Wachtwoorden komen niet overeen.'); return; }
    setSavingPw(true);
    try {
      await api.put('/auth/me/password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPwMsg('Wachtwoord succesvol gewijzigd.');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwErr(err.response?.data?.error || 'Wijzigen mislukt.');
    } finally {
      setSavingPw(false);
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Profiel</h1>
          <p className="page-header__sub">Beheer je account en inloggegevens</p>
        </div>
      </div>

      {/* Avatar + info */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--accent-dim)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{user?.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</div>
          {user?.club && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{user.club}</div>}
        </div>
      </div>

      {/* Profile form */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="section-title" style={{ marginBottom: 16 }}>Profielinformatie</h2>
        {profileMsg && <div className="alert alert-success">{profileMsg}</div>}
        {profileErr && <div className="alert alert-error">{profileErr}</div>}
        <form onSubmit={handleProfileSave}>
          <div className="form-group">
            <label className="form-label">Naam</label>
            <input
              className="form-input"
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">E-mailadres</label>
            <input className="form-input" type="email" value={user?.email || ''} disabled style={{ opacity: 0.5 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Club (optioneel)</label>
            <input
              className="form-input"
              type="text"
              placeholder="bijv. AFC Ajax"
              value={profile.club}
              onChange={(e) => setProfile({ ...profile, club: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingProfile}>
            {savingProfile ? <span className="spinner" /> : null}
            {savingProfile ? 'Opslaan...' : 'Profiel opslaan'}
          </button>
        </form>
      </div>

      {/* Password form */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="section-title" style={{ marginBottom: 16 }}>Wachtwoord wijzigen</h2>
        {pwMsg && <div className="alert alert-success">{pwMsg}</div>}
        {pwErr && <div className="alert alert-error">{pwErr}</div>}
        <form onSubmit={handlePwSave}>
          <div className="form-group">
            <label className="form-label">Huidig wachtwoord</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nieuw wachtwoord</label>
            <input
              className="form-input"
              type="password"
              placeholder="Minimaal 6 tekens"
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Bevestig nieuw wachtwoord</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingPw}>
            {savingPw ? <span className="spinner" /> : null}
            {savingPw ? 'Wijzigen...' : 'Wachtwoord wijzigen'}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="card" style={{ borderColor: 'rgba(248,81,73,0.3)' }}>
        <h2 className="section-title" style={{ marginBottom: 6, color: 'var(--red)' }}>Account</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
          Uitloggen op dit apparaat.
        </p>
        <button className="btn btn-danger" onClick={logout}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Uitloggen
        </button>
      </div>
    </div>
  );
}
