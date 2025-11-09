import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { CartProvider } from './src/contexts/CartContext';

export default function App() {
  return (
    <CartProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </CartProvider>
  );
}
