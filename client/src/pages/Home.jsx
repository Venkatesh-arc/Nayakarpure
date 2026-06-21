import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import './Home.css';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProducts()
      .then(({ products }) => setProducts(products.slice(0, 4)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <img src="/images/banner.png" alt="Nayakar Pure - Natural Peanut Butter" className="hero-banner" />
        <div className="hero-overlay">
          <div className="container hero-content">
            <Link to="/shop" className="btn btn-gold">Shop Now</Link>
          </div>
        </div>
      </section>

      <section className="features-bar">
        <div className="container features-grid">
          <div className="feature-item">
            <span className="feature-icon">🌿</span>
            <div>
              <strong>100% Natural</strong>
              <p>No artificial additives</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">💪</span>
            <div>
              <strong>Rich in Protein</strong>
              <p>Healthy fats & nutrition</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">✨</span>
            <div>
              <strong>No Preservatives</strong>
              <p>Pure goodness only</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container featured-section">
        <h2 className="section-title">Our Best Sellers</h2>
        <p className="section-subtitle">Nature's goodness in every bite</p>
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : (
          <div className="products-grid">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
        <div className="text-center" style={{ marginTop: '2rem' }}>
          <Link to="/shop" className="btn btn-outline">View All Products</Link>
        </div>
      </section>

      <section className="promise-section">
        <div className="container">
          <h2 className="section-title" style={{ color: 'var(--cream)' }}>Our Promise</h2>
          <div className="promise-grid">
            <div className="promise-card">
              <h3>Simple Ingredients</h3>
              <p>Made from quality peanuts with nothing else. True nutrition, pure you.</p>
            </div>
            <div className="promise-card">
              <h3>Real Taste</h3>
              <p>Roasted to perfection for that authentic, rich peanut flavor you'll love.</p>
            </div>
            <div className="promise-card">
              <h3>Pure Goodness</h3>
              <p>Every jar is crafted with care — zero compromise on quality.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
