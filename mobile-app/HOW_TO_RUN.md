# ☕ How to Run the Cofi Mobile App

This guide will help you run the React Native mobile app on your device or simulator.

## 📱 Quick Start (Easiest Method)

### Option 1: Run on Your Phone with Expo Go

**This is the fastest way to see your app!**

1. **Install Expo Go on your phone**
   - **iOS**: Download from [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - **Android**: Download from [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Start the app**
   ```bash
   cd mobile-app
   npm start
   ```

3. **Scan the QR code**
   - **iOS**: Open the Camera app and scan the QR code in your terminal
   - **Android**: Open Expo Go app and tap "Scan QR Code"

4. **Done!** The app will load on your phone

---

## 🖥️ Other Ways to Run

### Option 2: Run in Web Browser

Great for quick testing without a phone or simulator.

```bash
cd mobile-app
npm start
# Then press 'w' in the terminal
```

The app will open at `http://localhost:8081` (or similar port)

**Note**: Some mobile features won't work in browser (like camera, notifications), but you can still test the UI and navigation.

---

### Option 3: iOS Simulator (Mac only)

**Requirements**:
- macOS
- Xcode installed (from App Store)

**Steps**:
```bash
cd mobile-app
npm start
# Then press 'i' in the terminal
```

This will:
- Open iOS Simulator automatically
- Install the app
- Start running

**First time setup**: Xcode may need to install additional components. This is automatic.

---

### Option 4: Android Emulator

**Requirements**:
- Android Studio installed
- Android emulator set up

**Steps**:

1. **Start Android emulator first**
   - Open Android Studio
   - Click "Device Manager" (phone icon)
   - Click the play button on a virtual device

2. **Run the app**
   ```bash
   cd mobile-app
   npm start
   # Then press 'a' in the terminal
   ```

---

## 🚀 Full Setup Instructions

### Prerequisites

Make sure you have these installed:

```bash
# Check Node.js (need 18+)
node --version

# Check npm
npm --version
```

If not installed, download from [nodejs.org](https://nodejs.org/)

### Installation

```bash
# 1. Navigate to the mobile app folder
cd mobile-app

# 2. Install dependencies
npm install

# 3. Start the development server
npm start
```

---

## 📋 Available Commands

When you run `npm start`, you'll see these options:

- Press `w` → Open in web browser
- Press `i` → Open in iOS simulator (Mac only)
- Press `a` → Open in Android emulator
- Press `r` → Reload app
- Press `m` → Toggle menu
- Press `?` → Show all commands

---

## 🎯 What to Test

Once the app is running, try these features:

### Phase 1 & 2 Features (Working Now)
- ✅ Browse menu with 20+ products
- ✅ Search and filter by category
- ✅ View product details
- ✅ Customize orders (size, milk, extras, notes)
- ✅ Add items to cart
- ✅ View cart with price breakdown
- ✅ Update quantities
- ✅ See cart badge with item count
- ✅ Add/remove favorites (heart icon)
- ✅ View favorites screen
- ✅ Browse store locations
- ✅ Call stores or get directions

### Navigation Flow
```
Home → Menu → Product Detail → Add to Cart → Cart → Checkout (placeholder)
     → Favorites
     → Locations (from Profile or Home)
```

---

## 🐛 Troubleshooting

### "Command not found: npm"
**Solution**: Install Node.js from [nodejs.org](https://nodejs.org/)

### "Cannot find module"
**Solution**:
```bash
cd mobile-app
rm -rf node_modules
npm install
```

### Metro bundler stuck
**Solution**:
```bash
npm start -- --reset-cache
```

### iOS simulator won't open
**Solution**:
- Make sure Xcode is installed
- Try opening Xcode once to install components
- Run: `npx expo run:ios`

### Android emulator not detected
**Solution**:
- Make sure emulator is running BEFORE starting app
- Check in Android Studio > Device Manager
- Try: `npx expo run:android`

### QR code won't scan
**Solution**:
- Make sure phone and computer are on same WiFi
- Try the "Expo Go" app instead of camera
- Use the manual connection option in Expo Go

### Port already in use
**Solution**:
```bash
# Kill the process
lsof -ti:8081 | xargs kill -9
# Or use a different port
npm start -- --port 8082
```

---

## 💡 Development Tips

### Hot Reload
- Changes to code will automatically refresh the app
- Shake your phone to open the developer menu
- Press "Reload" to manually refresh

### Debug Mode
- Shake phone → "Debug Remote JS"
- Open browser console at `http://localhost:8081/debugger-ui`
- See console.log outputs

### Clear Cache
```bash
npm start -- --clear
```

### View App on Multiple Devices
- Run `npm start` once
- Scan QR code on multiple phones
- All will connect to the same development server

---

## 📱 Expo Go App Features

The Expo Go app lets you:
- ✅ Test on real device instantly
- ✅ Share with others (send them the QR code)
- ✅ No need to build/compile
- ✅ Fast refresh on code changes
- ✅ Access to device features (camera, location, etc.)

---

## 🎨 App Structure

```
mobile-app/
├── src/
│   ├── components/       # Reusable UI components
│   ├── contexts/         # Global state (Cart, Favorites)
│   ├── data/            # Sample products & locations
│   ├── navigation/      # Tab & stack navigation
│   ├── screens/         # All app screens
│   ├── theme/           # Colors, spacing, typography
│   └── types/           # TypeScript types
├── App.tsx             # Entry point
└── package.json        # Dependencies
```

---

## 🔄 The Difference from the Dashboard

### Admin Dashboard (Next.js)
- Runs on `http://localhost:3000`
- Web application
- For managing the coffee shop
- Uses `npm run dev` in root directory

### Mobile App (React Native + Expo)
- Runs on `http://localhost:8081`
- Mobile application
- For customers ordering coffee
- Uses `npm start` in mobile-app directory

**Both apps can run simultaneously!**

```bash
# Terminal 1: Run dashboard
npm run dev

# Terminal 2: Run mobile app
cd mobile-app
npm start
```

---

## 🎯 Next Steps

### When You're Ready for More

**Phase 3: Supabase Integration** (requires manual setup)
- Connect to Supabase backend
- Add your database URL and keys
- Real product data

**Phase 4: Payments** (requires Stripe account)
- Set up Stripe account
- Add API keys
- Test payments

See `PHASE_1_COMPLETE.md` and `PHASE_2_COMPLETE.md` for details on what's already built!

---

## 📞 Need Help?

Common issues:
- **App won't start**: Check Node.js version (need 18+)
- **QR code fails**: Use web browser option instead (`w`)
- **Slow refresh**: Clear cache (`npm start -- --clear`)
- **Build errors**: Delete node_modules and reinstall

---

## ✨ Pro Tips

1. **Use the web version** for quick CSS/layout testing
2. **Use Expo Go** for testing on your actual phone
3. **Use simulators** when you need to test iOS/Android specific features
4. **Shake your device** to access developer menu
5. **Press R twice** in terminal for fast refresh

---

## 🎉 You're Ready!

The easiest way to get started:

```bash
cd mobile-app
npm install
npm start
# Scan QR code with Expo Go app
```

**That's it!** Your coffee app is now running on your phone! ☕📱
