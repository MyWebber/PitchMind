import { useState, useEffect } from 'react';
import api from '../api';

function timeAgo(str) {
  if (!str) return '';
  const diff = Date.now() - new Date(str).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'zojuist';
  if (m < 60) return `${m} min. geleden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} uur geleden`;
  const d = Math.floor(h / 24);
  return `${d} dag${d !== 1 ? 'en' : ''} geleden`;
}

const TYPE_ICON = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="16 12 12 16 8 12" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    api.get('/notifications')
      .then((r) => { setNotifications(r.data.notifications); setUnread(r.data.unread); })
      .finally(() => setLoading(false));
  }, []);

  async function markRead(id) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: 1 } : n));
    setUnread((u) => Math.max(0, u - 1));
    await api.put(`/notifications/${id}/read`).catch(() => {});
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
      setUnread(0);
    } finally {
      setMarkingAll(false);
    }
  }

  async function deleteNotif(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const was = notifications.find((n) => n.id === id);
    if (was && !was.read) setUnread((u) => Math.max(0, u - 1));
    await api.delete(`/notifications/${id}`).catch(() => {});
  }

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner spinner-lg" />
        <span>Meldingen laden...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Notificaties</h1>
          <p className="page-header__sub">{unread > 0 ? `${unread} ongelezen` : 'Alles gelezen'}</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary" onClick={markAllRead} disabled={markingAll}>
            {markingAll ? <span className="spinner" /> : null}
            Alles als gelezen markeren
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <h3>Geen meldingen</h3>
          <p>Je bent helemaal bij</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`notif-item${!n.read ? ' notif-item--unread' : ''}`}
              onClick={() => !n.read && markRead(n.id)}
              style={{ cursor: !n.read ? 'pointer' : 'default' }}
            >
              <div className={`notif-dot${n.read ? ' notif-dot--read' : ''}`} />
              <div
                style={{
                  color: n.type === 'success' ? 'var(--green)'
                    : n.type === 'warning' ? 'var(--amber)'
                    : n.type === 'error' ? 'var(--red)'
                    : 'var(--accent)',
                  marginTop: 2, flexShrink: 0,
                }}
              >
                {TYPE_ICON[n.type] || TYPE_ICON.info}
              </div>
              <div className="notif-content">
                <div className="notif-title">{n.title}</div>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{timeAgo(n.created_at)}</div>
              </div>
              <div className="notif-actions">
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  title="Verwijderen"
                  onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
