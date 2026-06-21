const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    credentials: options.credentials ?? 'include',
    ...options,
    headers
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || 'Request failed' };
  }

  if (!res.ok) {
    const message = data.error || (data.errors ? data.errors.map(e => e.msg).join(', ') : 'Request failed');
    const error = new Error(message);
    error.status = res.status;
    error.errors = data.errors;
    throw error;
  }
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  googleAuth: (body) => request('/auth/google', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  requestProfileUpdate: (body) => request('/auth/me/request-update', { method: 'POST', body: JSON.stringify(body) }),
  confirmProfileUpdate: (body) => request('/auth/me/confirm-update', { method: 'POST', body: JSON.stringify(body) }),
  createAddress: (body) => request('/auth/me/addresses', { method: 'POST', body: JSON.stringify(body) }),
  updateAddress: (id, body) => request(`/auth/me/addresses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAddress: (id) => request(`/auth/me/addresses/${id}`, { method: 'DELETE' }),
  setDefaultAddress: (id) => request(`/auth/me/addresses/${id}/default`, { method: 'PATCH' }),
  forgotPassword: (body) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  verifyRegistrationOtp: (body) => request('/auth/verify-registration-otp', { method: 'POST', body: JSON.stringify(body) }),
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  getCategories: () => request('/products/categories'),
  getCart: () => request('/cart'),
  addToCart: (productId, quantity = 1) =>
    request('/cart', { method: 'POST', body: JSON.stringify({ productId, quantity }) }),
  updateCartItem: (id, quantity) =>
    request(`/cart/${id}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),
  removeCartItem: (id) => request(`/cart/${id}`, { method: 'DELETE' }),
  clearCart: () => request('/cart', { method: 'DELETE' }),
  getPaymentMethods: () => request('/orders/payment-methods'),
  getShippingCharge: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/shipping/charges?${qs}`);
  },
  createOrder: (body) => request('/orders/create', { method: 'POST', body: JSON.stringify(body) }),
  verifyPayment: (body) => request('/orders/verify-payment', { method: 'POST', body: JSON.stringify(body) }),
  getMyOrders: () => request('/orders/my-orders'),
  getOrderTracking: (id) => request(`/orders/${id}/tracking`),
  getOrderInvoice: (id) => request(`/orders/${id}/invoice`),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
  cancelOrderWithFeedback: (id, body) => request(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify(body) }),
  sendContact: (body) => request('/contact', { method: 'POST', body: JSON.stringify(body) }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  // Admin
  adminDashboard: () => request('/admin/dashboard'),
  adminGetProducts: () => request('/admin/products'),
  adminCreateProduct: (body) => request('/admin/products', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateProduct: (id, body) => request(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  adminDeleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),
  adminGetOrders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/orders${qs ? `?${qs}` : ''}`);
  },
  adminGetOrder: (id) => request(`/admin/orders/${id}`),
  adminUpdateOrder: (id, body) => request(`/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminGetCustomers: () => request('/admin/customers'),
  adminGetContact: () => request('/admin/contact'),
  adminMarkContactRead: (id, read = true) =>
    request(`/admin/contact/${id}`, { method: 'PATCH', body: JSON.stringify({ read }) })
};
