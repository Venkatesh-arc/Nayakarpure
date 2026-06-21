import { useEffect, useState } from 'react';
import { api } from '../../api';
import './Admin.css';

export default function Contact() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.adminGetContact()
      .then(({ messages: m }) => setMessages(m))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markRead = async (id) => {
    try {
      await api.adminMarkContactRead(id, true);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
    } catch (err) {
      setError(err.message);
    }
  };

  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <div>
      <div className="admin-page-header">
        <h1>Contact Messages</h1>
        {unreadCount > 0 && (
          <span className="admin-badge unread">{unreadCount} unread</span>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p className="loading">Loading messages...</p>
      ) : messages.length === 0 ? (
        <div className="admin-section"><p className="admin-empty">No messages yet.</p></div>
      ) : (
        <div className="admin-section">
          {messages.map((m) => (
            <div key={m.id} className={`message-card${m.read ? '' : ' unread'}`}>
              <div className="message-card-header">
                <div>
                  <strong>{m.name}</strong>
                  <span className="message-card-meta"> — {m.email}</span>
                  {m.phone && <span className="message-card-meta"> · {m.phone}</span>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {!m.read && (
                    <button type="button" className="btn-sm-action" onClick={() => markRead(m.id)}>
                      Mark Read
                    </button>
                  )}
                  <span className="message-card-meta">
                    {new Date(m.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <p><strong>Subject:</strong> {m.subject}</p>
              <p style={{ marginTop: '0.5rem' }}>{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
