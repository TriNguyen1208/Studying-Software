'use client';

/**
 * context/CartContext.jsx - Quản lý Giỏ hàng Toàn cục trên Client
 * Sử dụng React Context API + LocalStorage để lưu trữ giỏ hàng của người dùng.
 */

import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Khôi phục giỏ hàng từ localStorage khi mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('techstore_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Không thể đọc cart từ localStorage:', e);
    }
    setIsLoaded(true);
  }, []);

  // Lưu lại mỗi khi items thay đổi
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('techstore_cart', JSON.stringify(items));
    }
  }, [items, isLoaded]);

  const addToCart = (product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId) => {
    setItems(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem('techstore_cart');
  };

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        clearCart,
        totalAmount,
        totalCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart phải được dùng bên trong CartProvider');
  }
  return context;
}
