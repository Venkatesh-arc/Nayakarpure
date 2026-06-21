import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setSubtotal(0);
      setItemCount(0);
      return;
    }
    try {
      const data = await api.getCart();
      setItems(data.items);
      setSubtotal(data.subtotal);
      setItemCount(data.itemCount);
    } catch {
      setItems([]);
      setSubtotal(0);
      setItemCount(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(async (productId, quantity = 1) => {
    await api.addToCart(productId, quantity);
    await refreshCart();
  }, [refreshCart]);

  const updateQuantity = useCallback(async (id, quantity) => {
    await api.updateCartItem(id, quantity);
    await refreshCart();
  }, [refreshCart]);

  const removeItem = useCallback(async (id) => {
    await api.removeCartItem(id);
    await refreshCart();
  }, [refreshCart]);

  return (
    <CartContext.Provider value={{ items, subtotal, itemCount, addToCart, updateQuantity, removeItem, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
