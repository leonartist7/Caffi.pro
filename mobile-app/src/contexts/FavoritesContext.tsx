import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product } from '../types';

interface FavoritesContextType {
  favorites: Product[];
  isFavorite: (productId: string) => boolean;
  addFavorite: (product: Product) => void;
  removeFavorite: (productId: string) => void;
  toggleFavorite: (product: Product) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined
);

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [favorites, setFavorites] = useState<Product[]>([]);

  const isFavorite = (productId: string): boolean => {
    return favorites.some((product) => product.id === productId);
  };

  const addFavorite = (product: Product) => {
    if (!isFavorite(product.id)) {
      setFavorites((prev) => [...prev, product]);
    }
  };

  const removeFavorite = (productId: string) => {
    setFavorites((prev) => prev.filter((product) => product.id !== productId));
  };

  const toggleFavorite = (product: Product) => {
    if (isFavorite(product.id)) {
      removeFavorite(product.id);
    } else {
      addFavorite(product);
    }
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        addFavorite,
        removeFavorite,
        toggleFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
