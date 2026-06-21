import { useEffect, useState } from 'react';
import { api } from '../../api';
import './Admin.css';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  category: 'Peanut Butter',
  stock: '',
  image: '',
  weight: '',
  features: ''
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.adminGetProducts()
      .then(({ products: p }) => setProducts(p))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal('create');
  };

  const openEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      category: product.category,
      stock: String(product.stock),
      image: product.image || '',
      weight: product.weight || '',
      features: (product.features || []).join(', ')
    });
    setModal(product.id);
  };

  const closeModal = () => {
    setModal(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const body = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      category: form.category,
      stock: parseInt(form.stock, 10),
      image: form.image || undefined,
      weight: form.weight || undefined,
      features: form.features ? form.features.split(',').map((s) => s.trim()).filter(Boolean) : []
    };

    try {
      if (modal === 'create') {
        await api.adminCreateProduct(body);
      } else {
        await api.adminUpdateProduct(modal, body);
      }
      closeModal();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.adminDeleteProduct(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1>Products</h1>
        <button type="button" className="btn btn-primary" onClick={openCreate}>+ Add Product</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p className="loading">Loading products...</p>
      ) : (
        <div className="admin-section">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Weight</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.category}</td>
                    <td>₹{p.price}</td>
                    <td>
                      {p.stock <= 20
                        ? <span className="admin-badge low-stock">{p.stock}</span>
                        : p.stock}
                    </td>
                    <td>{p.weight || '—'}</td>
                    <td className="actions">
                      <button type="button" className="btn-sm-action" onClick={() => openEdit(p)}>Edit</button>
                      <button type="button" className="btn-danger" onClick={() => handleDelete(p.id, p.name)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modal === 'create' ? 'Add Product' : 'Edit Product'}</h3>
            <form onSubmit={handleSubmit} className="admin-form-grid">
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea id="description" name="description" value={form.description} onChange={handleChange} rows={3} required />
              </div>
              <div className="admin-form-row">
                <div className="form-group">
                  <label htmlFor="price">Price (₹)</label>
                  <input id="price" name="price" type="number" min="1" step="1" value={form.price} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="stock">Stock</label>
                  <input id="stock" name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <input id="category" name="category" value={form.category} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="weight">Weight</label>
                  <input id="weight" name="weight" value={form.weight} onChange={handleChange} placeholder="e.g. 500g" />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="image">Image URL</label>
                <input id="image" name="image" value={form.image} onChange={handleChange} placeholder="/images/products/..." />
              </div>
              <div className="form-group">
                <label htmlFor="features">Features (comma-separated)</label>
                <input id="features" name="features" value={form.features} onChange={handleChange} placeholder="High Protein, No Preservatives" />
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
