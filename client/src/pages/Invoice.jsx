import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import './Invoice.css';

export default function Invoice() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    api.getOrderInvoice(id)
      .then(({ invoice }) => setInvoice(invoice))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isAuthenticated, navigate]);

  const handlePrint = () => window.print();

  if (loading) return <div className="loading page">Loading invoice...</div>;
  if (error) {
    return (
      <div className="page container text-center">
        <div className="alert alert-error">{error}</div>
        <Link to="/orders" className="btn btn-primary">Back to Orders</Link>
      </div>
    );
  }

  return (
    <div className="invoice-page">
      <div className="invoice-toolbar no-print">
        <Link to="/orders" className="btn btn-outline">← Back to Orders</Link>
        <button type="button" className="btn btn-primary" onClick={handlePrint}>
          Print / Download
        </button>
      </div>

      <div className="invoice-document card">
        <header className="invoice-header">
          <div>
            <img src="/images/logo.png" alt="Nayakar Pure" className="invoice-logo" />
            <p className="invoice-brand-tagline">100% Natural Peanut Butter</p>
          </div>
          <div className="invoice-title-block">
            <h1>Tax Invoice</h1>
            <p><strong>{invoice.invoiceNumber}</strong></p>
            <p>{new Date(invoice.date).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}</p>
          </div>
        </header>

        <div className="invoice-meta-grid">
          <div>
            <h3>Bill To</h3>
            <p><strong>{invoice.customer.name}</strong></p>
            <p>{invoice.customer.email}</p>
            <p>{invoice.customer.phone}</p>
            <p>{invoice.customer.address}</p>
            <p>{invoice.customer.city}, {invoice.customer.state} — {invoice.customer.pincode}</p>
          </div>
          <div>
            <h3>Order Details</h3>
            <p><strong>Order:</strong> {invoice.orderNumber}</p>
            {invoice.trackingNumber && (
              <p><strong>Tracking:</strong> {invoice.trackingNumber}</p>
            )}
            <p><strong>Status:</strong> {invoice.status}</p>
            <p><strong>Payment:</strong> {invoice.paymentMethod.toUpperCase()} ({invoice.paymentStatus})</p>
            {invoice.paymentId && <p><strong>Payment ID:</strong> {invoice.paymentId}</p>}
          </div>
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Weight</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i}>
                <td>{item.name}</td>
                <td>{item.weight || '—'}</td>
                <td>{item.quantity}</td>
                <td>₹{item.price}</td>
                <td>₹{item.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-totals">
          <div className="invoice-total-row">
            <span>Subtotal</span>
            <span>₹{invoice.subtotal}</span>
          </div>
          <div className="invoice-total-row">
            <span>Delivery</span>
            <span>₹{invoice.deliveryFee}</span>
          </div>
          <div className="invoice-total-row invoice-grand-total">
            <span>Grand Total</span>
            <span>₹{invoice.total}</span>
          </div>
        </div>

        <footer className="invoice-footer">
          <p>Thank you for shopping with {invoice.brand}!</p>
          <p>{invoice.brandEmail} · {invoice.brandPhone}</p>
          <p className="invoice-note">This is a computer-generated invoice.</p>
        </footer>
      </div>
    </div>
  );
}
