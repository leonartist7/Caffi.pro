import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { CartProvider } from './src/contexts/CartContext';
import { FavoritesProvider } from './src/contexts/FavoritesContext';

export default function App() {
  return (
    <FavoritesProvider>
      <CartProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </CartProvider>
    </FavoritesProvider>
  );
}
