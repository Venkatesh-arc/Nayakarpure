import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { profileUpdateErrors, addressFormErrors, authOtpErrors } from '../utils/validation.js';
import './Auth.css';

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout, requestProfileUpdate, confirmProfileUpdate } = useAuth();

  // Redirect if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }
  const [form, setForm] = useState({ name: '', email: '', phone: '', currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpHint, setOtpHint] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  const { addAddress, editAddress, removeAddress, setDefaultAddr } = useAuth();

  const [addressForm, setAddressForm] = useState({ name: '', phone: '', address: '', city: '', state: '', pincode: '' });
  const [editingAddressId, setEditingAddressId] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        currentPassword: '',
        newPassword: ''
      });
    }
  }, [user]);

  const resetForm = () => {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      currentPassword: '',
      newPassword: ''
    });
    setErrors({});
    setMessage('');
    setOtp('');
    setOtpMode(false);
    setOtpHint('');
    setIsEditing(false);
  };

  const validate = () => {
    const errs = profileUpdateErrors(form);
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
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        currentPassword: form.currentPassword || undefined,
        newPassword: form.newPassword || undefined
      };
      const result = await requestProfileUpdate(payload);
      setOtpMode(true);
      setOtpHint(result.otp ? `OTP: ${result.otp}` : 'Check your email or phone for the OTP.');
      setMessage(result.message || 'OTP sent. Please confirm the update.');
    } catch (err) {
      setMessage(err.message || 'Unable to request profile update');
      if (err.errors) {
        const fieldErrors = {};
        err.errors.forEach((e) => { fieldErrors[e.path] = e.msg; });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }));
  };

  const updateAddressField = (field, value) => {
    setAddressForm(a => ({ ...a, [field]: value }));
  };

  const handleAddOrEditAddress = async () => {
    const errs = addressFormErrors(addressForm);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setMessage('Please fix the highlighted fields');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      if (editingAddressId) {
        await editAddress(editingAddressId, addressForm);
        setMessage('Address updated');
      } else {
        await addAddress(addressForm);
        setMessage('Address added');
      }
      setAddressForm({ label: '', name: '', phone: '', address: '', city: '', state: '', pincode: '' });
      setEditingAddressId(null);
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        const fieldErrs = {};
        err.errors.forEach(e => { fieldErrs[e.param || e.path || 'general'] = e.msg; });
        setErrors(fieldErrs);
        setMessage('Please fix the highlighted fields');
      } else {
        setMessage(err.message || 'Address operation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditAddressClick = (addr) => {
    setEditingAddressId(addr._id);
    setAddressForm({ name: addr.name || '', phone: addr.phone || '', address: addr.address || '', city: addr.city || '', state: addr.state || '', pincode: addr.pincode || '' });
    setActiveTab('addresses');
  };

  const handleDeleteAddress = async (id) => {
    if (!confirm('Delete this address?')) return;
    try {
      setLoading(true);
      await removeAddress(id);
      setMessage('Address removed');
    } catch (err) {
      setMessage(err.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      setLoading(true);
      await setDefaultAddr(id);
      setMessage('Default address set');
    } catch (err) {
      setMessage(err.message || 'Failed to set default');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = async () => {
    const errs = authOtpErrors(otp);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    setMessage('');
    setErrors({});
    try {
      await confirmProfileUpdate({ token: otp });
      setMessage('Profile update confirmed');
      setOtpMode(false);
      setOtp('');
      setIsEditing(false);
    } catch (err) {
      setMessage(err.message || 'OTP confirmation failed');
      if (err.errors) {
        const fieldErrors = {};
        err.errors.forEach((e) => { fieldErrors[e.path] = e.msg; });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="page container"><p>Loading profile...</p></div>;
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <img src="/images/logo.png" alt="Nayakar Pure" className="auth-logo" />
        <h2>My Profile</h2>
        <p className="auth-subtitle">Update your name, email, phone or password.</p>

        <div className="profile-tabs" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button className={`btn ${activeTab==='profile' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('profile')}>Profile</button>
          <button className={`btn ${activeTab==='addresses' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('addresses')}>Addresses</button>
        </div>

        {message && <div className="alert alert-success">{message}</div>}

        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              className={errors.name ? 'error' : ''}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              disabled={!isEditing || otpMode}
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className={errors.email ? 'error' : ''}
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              disabled={!isEditing || otpMode}
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              className={errors.phone ? 'error' : ''}
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="10-digit mobile"
              maxLength={10}
              disabled={!isEditing || otpMode}
            />
            {errors.phone && <p className="field-error">{errors.phone}</p>}
          </div>
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              className={errors.currentPassword ? 'error' : ''}
              value={form.currentPassword}
              onChange={(e) => update('currentPassword', e.target.value)}
              disabled={!isEditing || otpMode}
            />
            {errors.currentPassword && <p className="field-error">{errors.currentPassword}</p>}
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              className={errors.newPassword ? 'error' : ''}
              value={form.newPassword}
              onChange={(e) => update('newPassword', e.target.value)}
              disabled={!isEditing || otpMode}
            />
            {errors.newPassword && <p className="field-error">{errors.newPassword}</p>}
          </div>
          {!otpMode ? (
            <>
              {!isEditing ? (
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(true)} style={{ width: '100%' }}>
                  Edit
                </button>
              ) : (
                <>
                  <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={loading} style={{ width: '100%' }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.8rem' }}>
                    {loading ? 'Request OTP' : 'Save Changes'}
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="otp-section">
              <div className="form-group">
                <label>OTP Code</label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={errors.token ? 'error' : ''}
                />
                {errors.token && <p className="field-error">{errors.token}</p>}
              </div>
              <button type="button" className="btn btn-primary" onClick={handleConfirmOtp} disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Confirming...' : 'Confirm OTP'}
              </button>
              <p className="auth-subtitle" style={{ marginTop: '1rem' }}>{otpHint}</p>
            </div>
          )}
          </form>
        )}

        {activeTab === 'addresses' && (
          <div>
            <h3>Your Addresses</h3>
            <div style={{ marginBottom: '1rem' }}>
              {(user?.addresses || []).map((addr) => (
                <div key={addr._id} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{addr.city + ', ' + addr.state}</strong>
                      <div>{addr.name} · {addr.phone}</div>
                      <div style={{ fontSize: '0.95rem' }}>{addr.address}, {addr.city} - {addr.pincode}</div>
                      {addr.default && <div style={{ color: 'green', fontSize: '0.9rem' }}>Default</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {!addr.default && <button className="btn btn-secondary" onClick={() => handleSetDefault(addr._id)}>Set Default</button>}
                      <button className="btn btn-secondary" onClick={() => handleEditAddressClick(addr)}>Edit</button>
                      <button className="btn btn-secondary" onClick={() => handleDeleteAddress(addr._id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: '1rem' }}>
              <h4>{editingAddressId ? 'Edit Address' : 'Add Address'}</h4>
              
              <div className="form-group">
                <label>Full Name</label>
                <input value={addressForm.name} onChange={(e) => updateAddressField('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={addressForm.phone} onChange={(e) => updateAddressField('phone', e.target.value)} maxLength={10} />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea value={addressForm.address} onChange={(e) => updateAddressField('address', e.target.value)} rows={2} />
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>City</label>
                  <input value={addressForm.city} onChange={(e) => updateAddressField('city', e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>State</label>
                  <input value={addressForm.state} onChange={(e) => updateAddressField('state', e.target.value)} />
                </div>
                <div className="form-group" style={{ width: 120 }}>
                  <label>Pincode</label>
                  <input value={addressForm.pincode} onChange={(e) => updateAddressField('pincode', e.target.value)} maxLength={6} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={handleAddOrEditAddress} disabled={loading}>{loading ? 'Saving...' : (editingAddressId ? 'Save Address' : 'Add Address')}</button>
                <button className="btn btn-secondary" onClick={() => { setAddressForm({ label: '', name: '', phone: '', address: '', city: '', state: '', pincode: '' }); setEditingAddressId(null); }}>Clear</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h3>My Orders</h3>
            <p><a href="/orders">View your orders</a></p>
          </div>
        )}

        <p className="auth-footer">
          <button type="button" className="btn btn-secondary" onClick={async () => { await logout(); navigate('/', { replace: true }); window.location.reload(); }} style={{ width: '100%' }}>
            Logout
          </button>
        </p>
      </div>
    </div>
  );
}
