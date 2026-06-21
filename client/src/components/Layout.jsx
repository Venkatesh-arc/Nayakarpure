import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Layout.css';

export default function Layout() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
    window.location.reload();
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="logo">
            <img src="/images/logo.png" alt="Nayakar Pure" className="logo-img" />
          </Link>

          <nav className="nav">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/shop">Shop</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/contact">Contact</NavLink>
          </nav>

          <div className="header-actions">
            <Link to="/cart" className="cart-btn" aria-label="Cart">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
            </Link>

            {isAuthenticated ? (
              <div className="user-menu">
                <span className="user-name">Hi, {user.name.split(' ')[0]}</span>
                {isAdmin && (
                  <Link to="/admin/dashboard" className="btn btn-sm btn-gold">Admin</Link>
                )}
                <Link to="/profile" className="btn btn-sm btn-outline">Profile</Link>
                <Link to="/orders" className="btn btn-sm btn-outline">Orders</Link>
                <button onClick={handleLogout} className="btn btn-sm btn-outline">Logout</button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-sm btn-primary">Login</Link>
            )}
          </div>
        </div>
      </header>

      <main><Outlet /></main>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <img src="/images/logo.png" alt="Nayakar Pure" className="footer-logo" />
              <p>Eat Natural. Live Healthy. Stay Pure.</p>
              <p className="footer-url">www.nayakarpure.com</p>
            </div>
            <div>
              <h4>Quick Links</h4>
              <Link to="/shop">Shop</Link>
              <Link to="/about">About Us</Link>
              <Link to="/contact">Contact</Link>
            </div>
            <div>
              <h4>Our Promise</h4>
              <p>100% Natural Ingredients</p>
              <p>Rich in Protein & Healthy Fats</p>
              <p>No Preservatives</p>
            </div>
            <div>
              <h4>Contact</h4>
              <p>Email: info@nayakarpure.com</p>
              <p>Phone: +91 98765 43210</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Nayakar Pure. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
