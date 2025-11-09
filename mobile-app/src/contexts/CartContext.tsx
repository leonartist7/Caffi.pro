import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, Product, ProductCustomization } from '../types';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
  addItem: (
    product: Product,
    customization: ProductCustomization,
    quantity: number,
    notes?: string
  ) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const TAX_RATE = 0.08; // 8% tax

export const CartProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const calculateItemPrice = (
    product: Product,
    customization: ProductCustomization
  ): number => {
    // Base price with size multiplier
    const sizeMultipliers = {
      small: 0.8,
      medium: 1.0,
      large: 1.3,
    };
    const basePrice = product.price * sizeMultipliers[customization.size];

    // Add extras
    const extrasPrice = customization.extras.reduce(
      (sum, extra) => sum + extra.price,
      0
    );

    return basePrice + extrasPrice;
  };

  const addItem = (
    product: Product,
    customization: ProductCustomization,
    quantity: number,
    notes?: string
  ) => {
    const newItem: CartItem = {
      product,
      quantity,
      customization,
      notes,
    };

    setItems((prevItems) => [...prevItems, newItem]);
  };

  const removeItem = (index: number) => {
    setItems((prevItems) => prevItems.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item, i) =>
        i === index ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = calculateItemPrice(item.product, item.customization);
    return sum + itemPrice * item.quantity;
  }, 0);

  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        tax,
        total,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
