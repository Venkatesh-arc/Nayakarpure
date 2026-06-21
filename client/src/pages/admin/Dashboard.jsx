import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import './Admin.css';

function formatCurrency(n) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminDashboard()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Loading dashboard...</p>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return null;

  const { stats, lowStock, recentOrders } = data;

  return (
    <div>
      <div className="admin-page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card highlight">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">{formatCurrency(stats.totalRevenue)}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Orders Today</div>
          <div className="stat-value">{stats.ordersToday}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{stats.totalOrders}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Products</div>
          <div className="stat-value">{stats.totalProducts}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Customers</div>
          <div className="stat-value">{stats.totalCustomers}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Unread Messages</div>
          <div className="stat-value">{stats.unreadMessages}</div>
        </div>
      </div>

      <div className="admin-section">
        <h2>Low Stock Alert ({stats.lowStockCount})</h2>
        {lowStock.length === 0 ? (
          <p className="admin-empty">All products are well stocked.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td><span className="admin-badge low-stock">{p.stock} left</span></td>
                    <td><Link to="/admin/products" className="btn-sm-action outline">Manage</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-section">
        <h2>Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <p className="admin-empty">No orders yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.order_number}</td>
                    <td>{o.customer?.name || '—'}</td>
                    <td>{formatCurrency(o.total)}</td>
                    <td><span className={`admin-badge ${o.status}`}>{o.status.replace(/_/g, ' ')}</span></td>
                    <td>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: '1rem' }}>
          <Link to="/admin/orders" className="btn btn-outline">View All Orders</Link>
        </div>
      </div>
    </div>
  );
}
