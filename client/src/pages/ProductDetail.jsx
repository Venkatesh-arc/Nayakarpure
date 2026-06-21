import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    api.getProduct(id)
      .then(({ product }) => setProduct(product))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setAdding(true);
    try {
      await addToCart(product.id, quantity);
      navigate('/cart');
    } catch (err) {
      alert(err.message);
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="loading page">Loading...</div>;
  if (!product) return <div className="loading page">Product not found. <Link to="/shop">Back to shop</Link></div>;

  const features = typeof product.features === 'string' ? JSON.parse(product.features) : product.features;

  return (
    <div className="page container">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }} className="product-detail-grid">
        <div className="card" style={{ padding: '3rem', textAlign: 'center', background: 'linear-gradient(135deg, var(--cream), var(--gold-light))' }}>
          <div style={{ width: 160, height: 220, margin: '0 auto', background: 'rgba(255,255,255,0.9)', borderRadius: '12px 12px 30px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-lg)' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', fontWeight: 700, color: 'var(--green-dark)' }}>NP</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2 }}>{product.name}</span>
          </div>
        </div>
        <div>
          <span className="badge">{product.category}</span>
          <h1 style={{ fontSize: '2.5rem', margin: '0.5rem 0' }}>{product.name}</h1>
          <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>{product.weight} · {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>
          <p style={{ marginBottom: '1.5rem', lineHeight: 1.8 }}>{product.description}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {features.map((f) => <span key={f} className="badge">{f}</span>)}
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--green-dark)', fontFamily: 'var(--font-serif)', marginBottom: '1.5rem' }}>
            ₹{product.price}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 500 }}>Qty:</label>
            <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '2px solid var(--cream-dark)' }}>
              {[...Array(Math.min(10, product.stock))].map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleAddToCart} disabled={adding || product.stock === 0} style={{ width: '100%', padding: '1rem' }}>
            {product.stock === 0 ? 'Out of Stock' : adding ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
