import { useState } from 'react';
import { api } from '../api';
import { contactFormErrors } from '../utils/validation.js';
import './Contact.css';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const validate = () => {
    const errs = contactFormErrors(form);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setSuccess('');
    try {
      const result = await api.sendContact(form);
      setSuccess(result.message);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  };

  const update = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  };

  return (
    <div className="page container">
      <h1 className="section-title">Contact Us</h1>
      <p className="section-subtitle">We'd love to hear from you</p>

      <div className="contact-layout">
        <div className="contact-info">
          <div className="contact-card card">
            <h3>Get in Touch</h3>
            <div className="contact-item">
              <span className="contact-icon">📧</span>
              <div>
                <strong>Email</strong>
                <p>help@nayakarpure.com</p>
              </div>
            </div>
            <div className="contact-item">
              <span className="contact-icon">📞</span>
              <div>
                <strong>Phone</strong>
                <p>+91 74003 70108</p>
              </div>
            </div>
            <div className="contact-item">
              <span className="contact-icon">📍</span>
              <div>
                <strong>Address</strong>
                <p>Nayakar Pure</p>
                <p>362 1/10 Vetravati Co-op Hsg Society,
                  Sagar Nagar, Parksite Vikhroli (W), Mumbai - 400079.
                </p>
              </div>
            </div>
            <div className="contact-item">
              <span className="contact-icon">🌐</span>
              <div>
                <strong>Website</strong>
                <p>www.nayakarpure.com</p>
              </div>
            </div>
          </div>
        </div>

        <form className="contact-form card" onSubmit={handleSubmit}>
          <h3>Send a Message</h3>
          {success && <div className="alert alert-success">{success}</div>}
          {errors.form && <div className="alert alert-error">{errors.form}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>Name *</label>
              <input className={errors.name ? 'error' : ''} value={form.name} onChange={(e) => update('name', e.target.value)} />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" className={errors.email ? 'error' : ''} value={form.email} onChange={(e) => update('email', e.target.value)} />
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input className={errors.phone ? 'error' : ''} value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="10-digit mobile" maxLength={10} />
            {errors.phone && <p className="field-error">{errors.phone}</p>}
          </div>
          <div className="form-group">
            <label>Subject *</label>
            <input className={errors.subject ? 'error' : ''} value={form.subject} onChange={(e) => update('subject', e.target.value)} />
            {errors.subject && <p className="field-error">{errors.subject}</p>}
          </div>
          <div className="form-group">
            <label>Message *</label>
            <textarea className={errors.message ? 'error' : ''} value={form.message} onChange={(e) => update('message', e.target.value)} rows={5} />
            {errors.message && <p className="field-error">{errors.message}</p>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}
