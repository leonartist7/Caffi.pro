# ☕ Cofi - Coffee Shop Mobile App

A complete coffee ordering mobile app built with React Native and Expo.

## 🚀 Tech Stack

- **React Native** with **Expo**
- **TypeScript** for type safety
- **React Navigation** for navigation (tabs + stack)
- **Supabase** for backend (ready to integrate)
- Coffee-themed design system

## 📱 Features Implemented (Phase 1)

### ✅ Core App Structure
- [x] Expo TypeScript project initialized
- [x] Tab navigation (Home, Menu, Cart, Orders, Profile)
- [x] Stack navigation for detail screens
- [x] Custom theme with coffee colors
- [x] Reusable UI components

### ✅ Menu & Product Catalog
- [x] Product database structure (20+ sample products)
- [x] Menu screen with category filtering
- [x] Product cards with images and pricing
- [x] Search functionality
- [x] Product detail view with customization options
- [x] Size selection (Small, Medium, Large)
- [x] Milk options (Whole, Skim, Oat, Almond, Soy, Coconut)
- [x] Extras (shots, syrups, toppings)
- [x] Quantity selection

### 🎨 UI Components
- Button (primary, secondary, outline, text variants)
- Card (elevated, outlined, flat variants)
- Input with label and error states
- Typography (h1-h3, body, caption, label)
- ProductCard with image and details

## 📁 Project Structure

```
mobile-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Typography.tsx
│   │   └── ProductCard.tsx
│   ├── data/               # Sample data and helpers
│   │   └── products.ts     # 20+ coffee products
│   ├── navigation/         # Navigation setup
│   │   ├── RootNavigator.tsx
│   │   └── TabNavigator.tsx
│   ├── screens/           # App screens
│   │   ├── Home/
│   │   ├── Menu/
│   │   ├── Cart/
│   │   ├── Orders/
│   │   ├── Profile/
│   │   └── ProductDetail/
│   ├── theme/             # Design tokens
│   │   ├── colors.ts
│   │   └── theme.ts
│   └── types/             # TypeScript types
│       └── index.ts
├── App.tsx
└── package.json
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Expo Go app on your phone (for testing)

### Installation

1. Navigate to the mobile app directory:
```bash
cd mobile-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your device:
   - Scan the QR code with Expo Go (Android)
   - Scan the QR code with Camera app (iOS)

Or run on simulators:
```bash
npm run ios      # iOS simulator (macOS only)
npm run android  # Android emulator
npm run web      # Web browser
```

## 🎨 Theme

The app uses a custom coffee-themed design system:

### Colors
- **Primary**: Coffee brown (#6F4E37)
- **Accent**: Latte cream (#D4A574)
- **Secondary**: Dark roast (#2D2424)

### Typography
- Font sizes from 12px to 36px
- Weights: regular, medium, semibold, bold
- Line heights optimized for readability

### Spacing
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, xxl: 48px

## 📝 Next Steps (Phase 2+)

### Cart & Ordering (Phase 3)
- [ ] Cart state management (Context or Zustand)
- [ ] Add to cart functionality
- [ ] Cart item management
- [ ] Order notes/special instructions
- [ ] Cart summary and totals

### Payment Integration (Phase 4)
- [ ] Stripe setup
- [ ] Apple Pay integration
- [ ] Google Pay integration
- [ ] Manual card entry
- [ ] Order confirmation

### Order Management (Phase 5)
- [ ] Supabase integration
- [ ] Order submission
- [ ] Order history
- [ ] Real-time order status updates
- [ ] Order tracking

### Extra Features (Phase 6)
- [ ] Favorites system
- [ ] Store locations
- [ ] Order scheduling
- [ ] Loyalty points

### Authentication (Phase 7)
- [ ] Email/password auth
- [ ] User profiles
- [ ] Connect features to user accounts

## 🔧 Development

### Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web
- `npm run lint` - Run ESLint

### Code Style

- TypeScript strict mode enabled
- Component-based architecture
- Custom hooks for reusable logic
- Typed navigation

## 📦 Dependencies

### Core
- react-native
- expo
- typescript

### Navigation
- @react-navigation/native
- @react-navigation/bottom-tabs
- @react-navigation/native-stack

### Backend (ready to integrate)
- @supabase/supabase-js
- @react-native-async-storage/async-storage

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler issues**
   ```bash
   npm start -- --clear
   ```

2. **iOS simulator not working**
   - Ensure Xcode is installed (macOS only)
   - Try: `npm run ios -- --simulator="iPhone 15"`

3. **Android emulator not working**
   - Ensure Android Studio is installed
   - Start emulator from Android Studio first

## 📄 License

This project is part of the Cofi coffee shop application suite.

## 🤝 Contributing

This is currently a development project. More details coming soon!
