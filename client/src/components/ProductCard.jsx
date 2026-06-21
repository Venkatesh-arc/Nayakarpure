import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import './ProductCard.css';

const PRODUCT_COLORS = {
  'Creamy Peanut Butter': { bg: '#e8d5a3', accent: '#c9a962' },
  'Crunchy Peanut Butter': { bg: '#d4a574', accent: '#8b6914' },
  'Chocolate Peanut Butter': { bg: '#3d2817', accent: '#5c3d2e', text: '#fff' },
  'Organic Peanut Butter': { bg: '#40916c', accent: '#2d6a4f', text: '#fff' },
  'Honey Peanut Butter': { bg: '#f4c430', accent: '#d4a017' },
  'Family Pack Combo': { bg: '#1a4d2e', accent: '#c9a962', text: '#fff' }
};

export default function ProductCard({ product }) {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const colors = PRODUCT_COLORS[product.name] || { bg: '#e8d5a3', accent: '#c9a962' };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await addToCart(product.id);
      setMessage('Added!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const features = typeof product.features === 'string'
    ? JSON.parse(product.features)
    : product.features || [];

  return (
    <div className="product-card card">
      <Link to={`/product/${product.id}`} className="product-image-link">
        <div
          className="product-image"
          style={{ background: `linear-gradient(135deg, ${colors.bg}, ${colors.accent})` }}
        >
          <div className="product-jar" style={{ color: colors.text || '#1a4d2e' }}>
            <span className="jar-label">NP</span>
            <span className="jar-name">{product.name.split(' ')[0]}</span>
          </div>
        </div>
      </Link>
      <div className="product-info">
        <span className="badge">{product.category}</span>
        <Link to={`/product/${product.id}`}>
          <h3 className="product-name">{product.name}</h3>
        </Link>
        <p className="product-weight">{product.weight}</p>
        <div className="product-features">
          {features.slice(0, 2).map((f) => (
            <span key={f} className="feature-tag">{f}</span>
          ))}
        </div>
        <div className="product-footer">
          <span className="product-price">₹{product.price}</span>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleAddToCart}
            disabled={loading || product.stock === 0}
          >
            {product.stock === 0 ? 'Out of Stock' : loading ? 'Adding...' : message || 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
