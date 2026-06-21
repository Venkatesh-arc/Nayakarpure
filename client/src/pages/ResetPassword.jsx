import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import './Auth.css';

export default function ResetPassword() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  const [form, setForm] = useState({ email: '', token: '', password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Valid email required';
    if (!form.token.trim()) errs.token = 'Reset token required';
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      errs.password = 'Must include uppercase, lowercase, and a number';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setMessage('');
    setErrors({});
    try {
      const result = await api.resetPassword(form);
      setMessage(result.message || 'Password reset successfully. You are now logged in.');
      setForm({ email: '', token: '', password: '' });
    } catch (err) {
      setMessage(err.message || 'Unable to reset password');
      if (err.errors) {
        const fieldErrors = {};
        err.errors.forEach((e) => { fieldErrors[e.path] = e.msg; });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <img src="/images/logo.png" alt="Nayakar Pure" className="auth-logo" />
        <h2>Reset Password</h2>
        <p className="auth-subtitle">Use the token sent to your email to create a new password.</p>

        {message && <div className="alert alert-success">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className={errors.email ? 'error' : ''}
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
          <div className="form-group">
            <label>Reset Token</label>
            <input
              className={errors.token ? 'error' : ''}
              value={form.token}
              onChange={(e) => update('token', e.target.value)}
            />
            {errors.token && <p className="field-error">{errors.token}</p>}
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              className={errors.password ? 'error' : ''}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
