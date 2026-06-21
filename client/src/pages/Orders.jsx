import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import CancellationFeedback from '../components/CancellationFeedback';
import './Orders.css';

function TrackingPanel({ orderId, onClose }) {
  const [tracking, setTracking] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getOrderTracking(orderId)
      .then((data) => {
        setTracking(data.tracking);
        setOrder(data.order);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  return (
    <div className="tracking-overlay" onClick={onClose}>
      <div className="tracking-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="tracking-header">
          <h3>Order Tracking</h3>
          <button type="button" className="tracking-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {loading && <p className="tracking-loading">Loading tracking...</p>}
        {error && <div className="alert alert-error">{error}</div>}

        {tracking && order && (
          <>
            <div className="tracking-meta">
              <p><strong>Order:</strong> {order.order_number}</p>
              {tracking.trackingNumber && (
                <p><strong>Tracking ID:</strong> {tracking.trackingNumber}</p>
              )}
            </div>

            {tracking.cancelled ? (
              <div className="tracking-cancelled">
                <p>This order was cancelled</p>
                {tracking.cancelledAt && (
                  <p className="tracking-date">
                    {new Date(tracking.cancelledAt).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            ) : tracking.events?.length > 0 ? (
              <ol className="tracking-steps">
                {tracking.events.map((event, idx) => (
                  <li
                    key={`${event.status || event.title}-${idx}`}
                    className={`tracking-step ${idx === tracking.events.length - 1 ? 'active' : ''}`}
                  >
                    <div className="tracking-step-marker" />
                    <div>
                      <strong>{event.title || event.status}</strong>
                      {event.location && <p>{event.location}</p>}
                      {event.description && <p>{event.description}</p>}
                      {event.event_time && (
                        <p className="tracking-date">{new Date(event.event_time).toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <ol className="tracking-steps">
                {tracking.steps.map((step) => (
                  <li
                    key={step.key}
                    className={`tracking-step ${step.completed ? 'completed' : ''} ${step.active ? 'active' : ''}`}
                  >
                    <div className="tracking-step-marker" />
                    <div>
                      <strong>{step.label}</strong>
                      <p>{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Orders() {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingId, setTrackingId] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const navigate = useNavigate();

  const loadOrders = () => {
    setLoading(true);
    api.getMyOrders()
      .then(({ orders }) => setOrders(orders))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadOrders();
  }, [isAuthenticated, navigate]);

  const handleCancel = async (order) => {
    setFeedbackOrder(order);
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    setFeedbackLoading(true);
    setError('');
    setMessage('');
    try {
      const { message: msg } = await api.cancelOrderWithFeedback(feedbackData.orderId, {
        reason: feedbackData.reason,
        rating: feedbackData.rating,
        feedback: feedbackData.feedback
      });
      setMessage(msg);
      loadOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const statusLabel = (order) => {
    if (order.status === 'cancelled') return 'Cancelled';
    return order.displayStatus?.replace(/_/g, ' ') || order.status;
  };

  if (loading) return <div className="loading page">Loading orders...</div>;

  return (
    <div className="page container orders-page">
      <h1 className="section-title">My Orders</h1>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {orders.length === 0 ? (
        <div className="text-center">
          <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>You haven't placed any orders yet.</p>
          <Link to="/shop" className="btn btn-primary">Start Shopping</Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="card order-card">
              <div className="order-card-header">
                <div>
                  <strong className="order-number">{order.order_number}</strong>
                  <p className="order-date">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                  {order.tracking_number && (
                    <p className="order-tracking-id">Tracking: {order.tracking_number}</p>
                  )}
            {order.estimated_delivery_date && (
              <p className="order-delivery-estimate">Estimated delivery: {new Date(order.estimated_delivery_date).toLocaleDateString('en-IN')}</p>
            )}
                </div>
                <div className="order-badges">
                  <span className={`badge badge-status badge-${order.status}`}>{statusLabel(order)}</span>
                  <span className={`badge badge-payment badge-${order.payment_status}`}>
                    {order.payment_status}
                  </span>
                </div>
              </div>

              <div className="order-items">
                {order.items.map((item, i) => (
                  <p key={i}>
                    {item.name} × {item.quantity} — ₹{item.price * item.quantity}
                  </p>
                ))}
              </div>

              <div className="order-card-footer">
                <span className="order-payment">{order.payment_method.toUpperCase()}</span>
                <strong className="order-total">₹{order.total}</strong>
              </div>

              <div className="order-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setTrackingId(order.id)}
                >
                  Track Order
                </button>
                <Link to={`/orders/${order.id}/invoice`} className="btn btn-sm btn-outline">
                  Invoice
                </Link>
                {order.canCancel && order.status !== 'cancelled' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => handleCancel(order)}
                    disabled={actionId === order.id}
                  >
                    {actionId === order.id ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {trackingId && (
        <TrackingPanel orderId={trackingId} onClose={() => setTrackingId(null)} />
      )}

      {feedbackOrder && (
        <CancellationFeedback
          orderId={feedbackOrder.id}
          orderNumber={feedbackOrder.order_number}
          onSubmit={handleFeedbackSubmit}
          onCancel={() => setFeedbackOrder(null)}
          loading={feedbackLoading}
        />
      )}
    </div>
  );
}
