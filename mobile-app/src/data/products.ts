import { Product, Extra } from '../types';

export const EXTRAS: Extra[] = [
  { id: 'extra-shot', name: 'Extra Shot', price: 0.75 },
  { id: 'whipped-cream', name: 'Whipped Cream', price: 0.50 },
  { id: 'caramel-drizzle', name: 'Caramel Drizzle', price: 0.50 },
  { id: 'chocolate-drizzle', name: 'Chocolate Drizzle', price: 0.50 },
  { id: 'vanilla-syrup', name: 'Vanilla Syrup', price: 0.60 },
  { id: 'hazelnut-syrup', name: 'Hazelnut Syrup', price: 0.60 },
  { id: 'cinnamon', name: 'Cinnamon', price: 0.25 },
];

export const PRODUCTS: Product[] = [
  // Hot Drinks
  {
    id: 'hot-americano',
    name: 'Americano',
    description: 'Rich espresso with hot water for a smooth, bold flavor',
    price: 3.50,
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd',
    category: 'hot',
    available: true,
  },
  {
    id: 'hot-latte',
    name: 'Caffè Latte',
    description: 'Smooth espresso with steamed milk and a light foam layer',
    price: 4.50,
    image_url: 'https://images.unsplash.com/photo-1561882468-9110e03e0f78',
    category: 'hot',
    available: true,
  },
  {
    id: 'hot-cappuccino',
    name: 'Cappuccino',
    description: 'Espresso with equal parts steamed milk and foam',
    price: 4.25,
    image_url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d',
    category: 'hot',
    available: true,
  },
  {
    id: 'hot-mocha',
    name: 'Caffè Mocha',
    description: 'Espresso with chocolate, steamed milk, and whipped cream',
    price: 5.00,
    image_url: 'https://images.unsplash.com/photo-1607013251379-e6eecfffe234',
    category: 'hot',
    available: true,
  },
  {
    id: 'hot-macchiato',
    name: 'Caramel Macchiato',
    description: 'Vanilla-flavored latte with caramel drizzle',
    price: 4.75,
    image_url: 'https://images.unsplash.com/photo-1599639957043-f3aa5c986398',
    category: 'hot',
    available: true,
  },
  {
    id: 'hot-flat-white',
    name: 'Flat White',
    description: 'Smooth ristretto shots with microfoam milk',
    price: 4.50,
    image_url: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f',
    category: 'hot',
    available: true,
  },

  // Iced Drinks
  {
    id: 'iced-americano',
    name: 'Iced Americano',
    description: 'Rich espresso over ice with cold water',
    price: 3.75,
    image_url: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7',
    category: 'iced',
    available: true,
  },
  {
    id: 'iced-latte',
    name: 'Iced Latte',
    description: 'Smooth espresso with cold milk over ice',
    price: 4.75,
    image_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735',
    category: 'iced',
    available: true,
  },
  {
    id: 'iced-mocha',
    name: 'Iced Mocha',
    description: 'Espresso with chocolate and cold milk over ice',
    price: 5.25,
    image_url: 'https://images.unsplash.com/photo-1642647391072-6a2416f048e5',
    category: 'iced',
    available: true,
  },
  {
    id: 'cold-brew',
    name: 'Cold Brew',
    description: 'Slow-steeped for 20 hours, smooth and naturally sweet',
    price: 4.25,
    image_url: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7',
    category: 'iced',
    available: true,
  },
  {
    id: 'iced-caramel-macchiato',
    name: 'Iced Caramel Macchiato',
    description: 'Vanilla-flavored iced latte with caramel drizzle',
    price: 5.00,
    image_url: 'https://images.unsplash.com/photo-1562447827-0f3a6cfc88e0',
    category: 'iced',
    available: true,
  },
  {
    id: 'nitro-cold-brew',
    name: 'Nitro Cold Brew',
    description: 'Cold brew infused with nitrogen for a creamy texture',
    price: 5.50,
    image_url: 'https://images.unsplash.com/photo-1609881795737-ba7c3a0fe95d',
    category: 'iced',
    available: true,
  },

  // Specialty Drinks
  {
    id: 'specialty-vanilla-latte',
    name: 'Vanilla Sweet Cream Latte',
    description: 'Espresso with vanilla syrup and sweet cream cold foam',
    price: 5.50,
    image_url: 'https://images.unsplash.com/photo-1578374173703-809e1d912cf9',
    category: 'specialty',
    available: true,
  },
  {
    id: 'specialty-pumpkin-spice',
    name: 'Pumpkin Spice Latte',
    description: 'Espresso with pumpkin, cinnamon, and nutmeg flavors',
    price: 5.75,
    image_url: 'https://images.unsplash.com/photo-1635620124150-4d14e5c93e38',
    category: 'specialty',
    available: true,
  },
  {
    id: 'specialty-irish-cream',
    name: 'Irish Cream Coffee',
    description: 'Rich coffee with Irish cream flavor and whipped cream',
    price: 5.50,
    image_url: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252',
    category: 'specialty',
    available: true,
  },
  {
    id: 'specialty-honey-latte',
    name: 'Honey Oat Latte',
    description: 'Espresso with honey and oat milk',
    price: 5.25,
    image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3',
    category: 'specialty',
    available: true,
  },

  // Food Items
  {
    id: 'food-croissant',
    name: 'Butter Croissant',
    description: 'Flaky, buttery French pastry',
    price: 3.50,
    image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a',
    category: 'food',
    available: true,
  },
  {
    id: 'food-muffin',
    name: 'Blueberry Muffin',
    description: 'Fresh-baked muffin loaded with blueberries',
    price: 3.75,
    image_url: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa',
    category: 'food',
    available: true,
  },
  {
    id: 'food-bagel',
    name: 'Everything Bagel',
    description: 'Toasted bagel with cream cheese',
    price: 4.00,
    image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a',
    category: 'food',
    available: true,
  },
  {
    id: 'food-sandwich',
    name: 'Breakfast Sandwich',
    description: 'Egg, cheese, and bacon on an English muffin',
    price: 6.50,
    image_url: 'https://images.unsplash.com/photo-1619096252214-ef06c45683e3',
    category: 'food',
    available: true,
  },
];

// Helper functions
export const getProductsByCategory = (category: string) => {
  return PRODUCTS.filter((product) => product.category === category);
};

export const getProductById = (id: string) => {
  return PRODUCTS.find((product) => product.id === id);
};

export const searchProducts = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return PRODUCTS.filter(
    (product) =>
      product.name.toLowerCase().includes(lowerQuery) ||
      product.description.toLowerCase().includes(lowerQuery)
  );
};
