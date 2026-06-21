import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useState } from 'react';
import './Cart.css';

export default function Cart() {
  const { isAuthenticated } = useAuth();
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(null);

  if (!isAuthenticated) {
    return (
      <div className="page container text-center">
        <h1 className="section-title">Your Cart</h1>
        <p style={{ marginBottom: '1.5rem' }}>Please login to view your cart.</p>
        <Link to="/login" className="btn btn-primary">Login / Register</Link>
      </div>
    );
  }

  const handleQuantityChange = async (id, qty) => {
    setUpdating(id);
    try {
      await updateQuantity(id, qty);
    } finally {
      setUpdating(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="page container text-center">
        <h1 className="section-title">Your Cart</h1>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-light)' }}>Your cart is empty.</p>
        <Link to="/shop" className="btn btn-primary">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="page container">
      <h1 className="section-title">Your Cart</h1>
      <div className="cart-layout">
        <div className="cart-items">
          {items.map((item) => (
            <div key={item.id} className="cart-item card">
              <div className="cart-item-info">
                <h3>{item.name}</h3>
                <p className="cart-item-weight">{item.weight}</p>
                <p className="cart-item-price">₹{item.price} each</p>
              </div>
              <div className="cart-item-actions">
                <div className="qty-control">
                  <button
                    onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                    disabled={updating === item.id || item.quantity <= 1}
                  >−</button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    disabled={updating === item.id || item.quantity >= item.stock}
                  >+</button>
                </div>
                <p className="cart-item-total">₹{item.price * item.quantity}</p>
                <button className="remove-btn" onClick={() => removeItem(item.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
        <div className="cart-summary card">
          <h3>Order Summary</h3>
          <div className="summary-row">
            <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
            <span>₹{subtotal}</span>
          </div>
          <div className="summary-row">
            <span>Delivery</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <span>₹{subtotal}</span>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => navigate('/checkout')}>
            Proceed to Checkout
          </button>
          <Link to="/shop" className="continue-shopping">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}
