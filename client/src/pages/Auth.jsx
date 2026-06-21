import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { authLoginErrors, authRegisterErrors, authOtpErrors } from '../utils/validation.js';
import './Auth.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const { login, register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated && user) {
    console.log('[Auth Guard] User is authenticated, redirecting to', user.role === 'admin' ? '/admin/dashboard' : '/');
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/'} replace />;
  }
  const googleButtonRef = useRef(null);

  // Prevent this page from being cached in browser back-forward cache
  // and refresh auth state when returning to this page
  useEffect(() => {
    console.log('[Auth.jsx] Component mounted, checking auth state...');
    
    // Prevent bfcache by using unload handler
    const preventBFCache = () => { };
    window.addEventListener('unload', preventBFCache);
    
    // Check auth state when component mounts
    const checkAuth = async () => {
      try {
        console.log('[Auth.jsx] Calling /auth/me to check if user is authenticated...');
        const { user: currentUser } = await api.getMe();
        if (currentUser) {
          // If user is authenticated, redirect immediately
          console.log('[Auth.jsx] User is authenticated, redirecting...');
          navigate(currentUser.role === 'admin' ? '/admin/dashboard' : '/', { replace: true });
        } else {
          console.log('[Auth.jsx] User is NOT authenticated, showing login form');
        }
      } catch (err) {
        // Not authenticated, allow page to show
        console.log('[Auth.jsx] Auth check failed (expected on logout):', err.message);
      }
    };
    
    checkAuth();
    
    return () => {
      window.removeEventListener('unload', preventBFCache);
    };
  }, [navigate]);

  // Initialize Google Sign-In
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      console.warn('Google Client ID not set. Google Sign-In will not work.');
      return;
    }

    let intervalId;
    const initGoogle = () => {
      if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        return false;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
          auto_select: false
        });

        if (googleButtonRef.current) {
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: isLogin ? 'signin' : 'signup'
          });
        }

        return true;
      } catch (err) {
        console.error('Failed to initialize Google Sign-In:', err);
        return false;
      }
    };

    if (!initGoogle()) {
      intervalId = window.setInterval(() => {
        if (initGoogle()) {
          window.clearInterval(intervalId);
        }
      }, 200);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [isLogin]);

  const validate = () => {
    const errs = isLogin ? authLoginErrors(form.email, form.password) : authRegisterErrors(form);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError('');
    try {
      let user;
      if (isLogin) {
        user = await login(form.email, form.password);
        navigate(user.role === 'admin' ? '/admin/dashboard' : '/', { replace: true });
      } else {
        const result = await register({ name: form.name, email: form.email, password: form.password, phone: form.phone || undefined });
        if (result.needsVerification) {
          setOtpMode(true);
          setPendingEmail(form.email);
          setVerificationMessage('Registration OTP sent. Please check your email.');
          setForm(f => ({ ...f, password: '' }));
          return;
        }
        if (result.user) {
          navigate(result.user.role === 'admin' ? '/admin/dashboard' : '/', { replace: true });
        }
      }
    } catch (err) {
      setApiError(err.message || 'Something went wrong');
      if (err.errors) {
        const fieldErrors = {};
        err.errors.forEach(e => { fieldErrors[e.path] = e.msg; });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const update = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  };

  const handleVerifyOtp = async () => {
    const errs = authOtpErrors(otp);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setApiError('');
    setVerificationMessage('');
    try {
      await api.verifyRegistrationOtp({ email: pendingEmail, otp });
      setVerificationMessage('OTP verified successfully. Please login to continue.');
      setOtpMode(false);
      setForm({ name: '', email: '', password: '', phone: '' });
      setOtp('');
      setPendingEmail('');
      setIsLogin(true);
    } catch (err) {
      setApiError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCallback = async (response) => {
    setLoading(true);
    setApiError('');
    try {
      const result = await api.googleAuth({ token: response.credential });
      if (result.user) {
        navigate(result.user.role === 'admin' ? '/admin/dashboard' : '/', { replace: true });
      }
    } catch (err) {
      setApiError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <img src="/images/logo.png" alt="Nayakar Pure" className="auth-logo" />
        <div className="auth-tabs">
          <button className={isLogin ? 'active' : ''} onClick={() => { setIsLogin(true); setErrors({}); setApiError(''); }}>Login</button>
          <button className={!isLogin ? 'active' : ''} onClick={() => { setIsLogin(false); setErrors({}); setApiError(''); }}>Register</button>
        </div>

        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="auth-subtitle">{isLogin ? 'Login to shop and track your orders' : 'Join Nayakar Pure family'}</p>

        {apiError && <div className="alert alert-error">{apiError}</div>}
        {verificationMessage && <div className="alert alert-success">{verificationMessage}</div>}

        {otpMode ? (
          <div>
            <div className="form-group">
              <label>OTP Code</label>
              <input type="text" className={errors.otp ? 'error' : ''} value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
              {errors.otp && <p className="field-error">{errors.otp}</p>}
            </div>
            <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={handleVerifyOtp} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <p className="auth-subtitle" style={{ marginTop: '1rem' }}>Enter the OTP sent to {pendingEmail}</p>
          </div>
        ) : (
          <>
            {GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE' ? (
              <>
                <div className="auth-divider">
                  <div ref={googleButtonRef} className="google-button-container"></div>
                </div>

                <div className="auth-separator">
                  <span>or</span>
                </div>
              </>
            ) : (
              <div className="auth-warning">
                ⚠️ Google Sign-In not configured. Please set VITE_GOOGLE_CLIENT_ID in .env
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="form-group">
                  <label>Full Name</label>
                  <input className={errors.name ? 'error' : ''} value={form.name} onChange={(e) => update('name', e.target.value)} />
                  {errors.name && <p className="field-error">{errors.name}</p>}
                </div>
              )}
              <div className="form-group">
                <label>Email</label>
                <input type="email" className={errors.email ? 'error' : ''} value={form.email} onChange={(e) => update('email', e.target.value)} />
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" className={errors.password ? 'error' : ''} value={form.password} onChange={(e) => update('password', e.target.value)} />
                {errors.password && <p className="field-error">{errors.password}</p>}
              </div>
              {isLogin && (
                <p className="auth-extra">
                  <Link to="/forgot-password">Forgot password?</Link>
                </p>
              )}
              {!isLogin && (
                <div className="form-group">
                  <label>Phone (optional)</label>
                  <input className={errors.phone ? 'error' : ''} value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="10-digit mobile" maxLength={10} />
                  {errors.phone && <p className="field-error">{errors.phone}</p>}
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
              </button>
            </form>
          </>
        )}

        <p className="auth-footer">
          <Link to="/">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
