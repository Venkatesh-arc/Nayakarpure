import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../api';
import { checkoutShippingErrors } from '../utils/validation.js';
import './Checkout.css';

const STORAGE_KEY = 'nayakar-pure-shipping';
const INITIAL_SHIPPING = { name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '' };

export default function Checkout() {
  const { isAuthenticated, user } = useAuth();
  const { items, subtotal, refreshCart } = useCart();
  const navigate = useNavigate();

  const [paymentMethod] = useState('cod');
  const [shipping, setShipping] = useState(INITIAL_SHIPPING);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [shippingCharge, setShippingCharge] = useState(null);
  const [shippingChargeLoading, setShippingChargeLoading] = useState(false);
  const [shippingEstimate, setShippingEstimate] = useState(null);
  const [shippingChargeError, setShippingChargeError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    const savedShipping = localStorage.getItem(STORAGE_KEY);
    if (savedShipping) {
      try {
        setShipping(JSON.parse(savedShipping));
        return;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Use user's default address if available
    const defaultAddr = user?.addresses?.find(a => a.default) || (user?.addresses && user.addresses[0]);
    if (defaultAddr) {
      setShipping({
        name: defaultAddr.name || user?.name || '',
        email: user?.email || '',
        phone: defaultAddr.phone || user?.phone || '',
        address: defaultAddr.address || '',
        city: defaultAddr.city || '',
        state: defaultAddr.state || '',
        pincode: defaultAddr.pincode || ''
      });
      return;
    }

    setShipping({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: '',
      city: '',
      state: '',
      pincode: ''
    });
  }, [isAuthenticated, items, navigate, user]);

  useEffect(() => {
    const loadShippingCharge = async () => {
      if (!/^[0-9]{6}$/.test(shipping.pincode)) {
        setShippingCharge(null);
        setShippingEstimate(null);
        setShippingChargeError('');
        return;
      }

      try {
        setShippingChargeLoading(true);
        const weightGrams = items.reduce((sum, item) => {
          const number = Number((item.weight || '').toString().replace(/[^0-9.]/g, '')) || 0;
          return sum + number * item.quantity;
        }, 0) || 500;

        const { charge } = await api.getShippingCharge({
          deliveryPincode: shipping.pincode,
          paymentType: 'cod',
          weightGrams
        });
        setShippingCharge(charge.charge ?? charge);
        setShippingEstimate(charge.estimatedDeliveryDays ? `${charge.estimatedDeliveryDays} days` : null);
        setShippingChargeError('');
      } catch (err) {
        setShippingCharge(null);
        setShippingEstimate(null);
        setShippingChargeError(err.message || 'Unable to fetch shipping charges');
      } finally {
        setShippingChargeLoading(false);
      }
    };

    if (shipping.pincode) {
      loadShippingCharge();
    }
  }, [shipping.pincode, paymentMethod, items]);

  const total = subtotal + (shippingCharge || 0);
  const canPlaceOrder = !submitting && !shippingChargeLoading && shippingCharge != null && !shippingChargeError;

  const validate = () => {
    const errs = checkoutShippingErrors(shipping, shippingCharge, shippingChargeError);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError('');

    try {
      const result = await api.createOrder({
        paymentMethod,
        shipping
      });

      await refreshCart();
      navigate('/order-success', {
        state: {
          orderNumber: result.orderNumber,
          paymentId: result.paymentId,
          message: result.message
        }
      });
    } catch (err) {
      setApiError(err.message || 'Order failed. Please try again.');
      if (err.errors) {
        const fieldErrors = {};
        err.errors.forEach(e => { fieldErrors[e.path] = e.msg; });
        setErrors(fieldErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateShipping = (field, value) => {
    setShipping(s => {
      const next = { ...s, [field]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  };

  const resetShipping = () => {
    const reset = {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: '',
      city: '',
      state: '',
      pincode: ''
    };
    localStorage.removeItem(STORAGE_KEY);
    setShipping(reset);
    setErrors({});
    setApiError('');
  };

  return (
    <div className="page container">
      <h1 className="section-title">Checkout</h1>
      <form onSubmit={handleSubmit} className="checkout-layout">
        <div className="checkout-form">
          {apiError && <div className="alert alert-error">{apiError}</div>}

          <section className="checkout-section card">
            <h3>Shipping Address</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input className={errors.name ? 'error' : ''} value={shipping.name} onChange={(e) => updateShipping('name', e.target.value)} />
                {errors.name && <p className="field-error">{errors.name}</p>}
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" className={errors.email ? 'error' : ''} value={shipping.email} onChange={(e) => updateShipping('email', e.target.value)} />
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>
            </div>
            <div className="form-group">
              <label>Phone *</label>
              <input className={errors.phone ? 'error' : ''} value={shipping.phone} onChange={(e) => updateShipping('phone', e.target.value)} placeholder="10-digit mobile number" maxLength={10} />
              {errors.phone && <p className="field-error">{errors.phone}</p>}
            </div>
            <div className="form-group">
              <label>Address *</label>
              <textarea className={errors.address ? 'error' : ''} value={shipping.address} onChange={(e) => updateShipping('address', e.target.value)} rows={3} />
              {errors.address && <p className="field-error">{errors.address}</p>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City *</label>
                <input className={errors.city ? 'error' : ''} value={shipping.city} onChange={(e) => updateShipping('city', e.target.value)} />
                {errors.city && <p className="field-error">{errors.city}</p>}
              </div>
              <div className="form-group">
                <label>State *</label>
                <input className={errors.state ? 'error' : ''} value={shipping.state} onChange={(e) => updateShipping('state', e.target.value)} />
                {errors.state && <p className="field-error">{errors.state}</p>}
              </div>
              <div className="form-group">
                <label>Pincode *</label>
                <input className={errors.pincode ? 'error' : ''} value={shipping.pincode} onChange={(e) => updateShipping('pincode', e.target.value)} maxLength={6} />
                {errors.pincode && <p className="field-error">{errors.pincode}</p>}
              </div>
            </div>
          </section>

          <section className="checkout-section card">
            <h3>Payment Method</h3>
            <div className="option-grid">
              <label className="option-card selected">
                <input type="radio" name="payment" value="cod" checked readOnly />
                <strong>Cash on Delivery</strong>
              </label>
            </div>
          </section>
        </div>

        <div className="checkout-summary card">
          <h3>Order Summary</h3>
          {items.map((item) => (
            <div key={item.id} className="checkout-item">
              <span>{item.name} × {item.quantity}</span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="checkout-item">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
          <div className="checkout-item">
            <span>Delivery charge</span>
            <span>{shippingChargeLoading ? 'Calculating...' : shippingCharge != null ? `₹${shippingCharge}` : 'Not available'}</span>
          </div>
          {shippingEstimate && (
            <p className="shipping-estimate">Estimated delivery in {shippingEstimate}</p>
          )}
          {!shippingChargeLoading && shipping.pincode && !shippingCharge && !shippingChargeError && (
            <div className="alert alert-info" style={{ marginTop: '1rem' }}>
              Enter a valid 6-digit pincode to calculate delivery charges.
            </div>
          )}
          {shippingChargeError && (
            <div className="alert alert-warning" style={{ marginTop: '1rem' }}>{shippingChargeError}</div>
          )}
          <div className="summary-total"><span>Total</span><span>₹{total}</span></div>
          <button type="button" className="btn btn-secondary" onClick={resetShipping} style={{ width: '100%', marginTop: '1.5rem' }} disabled={submitting}>
            Reset Address
          </button>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={!canPlaceOrder}>
            {submitting ? 'Processing...' : `Place Order — ₹${total}`}
          </button>
          <p className="secure-note">🔒 Secure checkout · Your data is encrypted</p>
        </div>
      </form>
    </div>
  );
}
