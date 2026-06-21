import { useEffect, useState } from 'react';
import { api } from '../../api';
import './Admin.css';

const STATUSES = [
  'placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'
];

const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'cod'];

function formatCurrency(n) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function OrderModal({ orderId, onClose, onUpdated }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => {
    api.adminGetOrder(orderId)
      .then(({ order: o }) => {
        setOrder(o);
        setStatus(o.status);
        setPaymentStatus(o.payment_status);
        setTrackingNumber(o.tracking_number || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { order: updated } = await api.adminUpdateOrder(orderId, {
        status,
        payment_status: paymentStatus,
        tracking_number: trackingNumber || undefined
      });
      setOrder(updated);
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <h3>Order {order?.order_number}</h3>
        {loading && <p>Loading...</p>}
        {error && <div className="alert alert-error">{error}</div>}

        {order && (
          <div className="order-detail-grid">
            <div className="order-detail-section">
              <h4>Customer</h4>
              <p>{order.customer?.name} — {order.customer?.email}</p>
              <p>{order.customer?.phone}</p>
            </div>

            <div className="order-detail-section">
              <h4>Shipping</h4>
              <p>{order.shipping_name}</p>
              <p>{order.shipping_address}, {order.shipping_city}</p>
              <p>{order.shipping_state} — {order.shipping_pincode}</p>
            </div>

            <div className="order-detail-section">
              <h4>Items</h4>
              <ul className="order-items-list">
                {order.items.map((item, i) => (
                  <li key={i}>
                    <span>{item.name} × {item.quantity}</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>
                Total: {formatCurrency(order.total)}
              </p>
            </div>

            <div className="admin-form-row">
              <div className="form-group">
                <label htmlFor="order-status">Order Status</label>
                <select id="order-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="payment-status">Payment Status</label>
                <select id="payment-status" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="tracking">Tracking Number</label>
              <input
                id="tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Auto-generated when shipped"
              />
            </div>

            <div className="admin-modal-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Update Order'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const load = () => {
    setLoading(true);
    const params = statusFilter ? { status: statusFilter } : {};
    api.adminGetOrders(params)
      .then(({ orders: o }) => setOrders(o))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const handleUpdated = (updated) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1>Orders</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="loading">Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="admin-section"><p className="admin-empty">No orders found.</p></div>
      ) : (
        <div className="admin-section">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><strong>{o.order_number}</strong></td>
                    <td>{o.customer?.name || '—'}</td>
                    <td>{formatCurrency(o.total)}</td>
                    <td><span className={`admin-badge ${o.payment_status}`}>{o.payment_status}</span></td>
                    <td><span className={`admin-badge ${o.status}`}>{o.status.replace(/_/g, ' ')}</span></td>
                    <td>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <button type="button" className="btn-sm-action" onClick={() => setSelectedId(o.id)}>
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedId && (
        <OrderModal
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
