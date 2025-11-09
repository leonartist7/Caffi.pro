// Product types
export type ProductCategory = 'hot' | 'iced' | 'specialty' | 'food';

export type ProductSize = 'small' | 'medium' | 'large';

export type MilkOption = 'whole' | 'skim' | 'oat' | 'almond' | 'soy' | 'coconut';

export interface Extra {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: ProductCategory;
  available: boolean;
}

export interface ProductCustomization {
  size: ProductSize;
  milk?: MilkOption;
  extras: Extra[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  customization: ProductCustomization;
  notes?: string;
}

// Order types
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product: Product;
  quantity: number;
  customizations: ProductCustomization;
  price: number;
}

export interface Order {
  id: string;
  user_id?: string;
  total: number;
  status: OrderStatus;
  created_at: string;
  notes?: string;
  items: OrderItem[];
}

// Store Location types
export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  hours: string;
  distance?: number;
}

// Navigation types
export type RootStackParamList = {
  MainTabs: undefined;
  ProductDetail: { productId: string };
  Checkout: undefined;
  Favorites: undefined;
  Locations: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Menu: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};
