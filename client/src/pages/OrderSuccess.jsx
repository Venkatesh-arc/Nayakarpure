import { Link, useLocation } from 'react-router-dom';

export default function OrderSuccess() {
  const { state } = useLocation();
  const orderNumber = state?.orderNumber || 'NP-ORDER';
  const message = state?.message || 'Your order has been placed successfully!';

  return (
    <div className="page container text-center" style={{ paddingTop: '4rem' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
      <h1 className="section-title">Thank You!</h1>
      <p style={{ fontSize: '1.1rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>{message}</p>
      <p style={{ marginBottom: '2rem' }}>
        Order Number: <strong style={{ color: 'var(--green-dark)' }}>{orderNumber}</strong>
      </p>
      {state?.paymentId && (
        <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '2rem' }}>
          Payment ID: {state.paymentId}
        </p>
      )}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/orders" className="btn btn-primary">View Orders</Link>
        <Link to="/shop" className="btn btn-outline">Continue Shopping</Link>
      </div>
    </div>
  );
}
