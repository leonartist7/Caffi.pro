# 📱 Mobile Testing Guide - Local Network (Windows 11)

Test your coffee shop app on your phone via local WiFi network.

---

## Prerequisites

✅ Your phone and Windows 11 PC must be on the **same WiFi network**
✅ Node.js and npm installed
✅ Project dependencies installed (`npm install`)

---

## Step 1: Find Your Computer's IP Address

### Option A: Using Command Prompt (Recommended)

1. Press `Win + R`
2. Type `cmd` and press Enter
3. Type: `ipconfig`
4. Look for **"Wireless LAN adapter Wi-Fi"** section
5. Find the line: `IPv4 Address. . . . : 192.168.x.x`

### Option B: Using PowerShell

1. Press `Win + X`
2. Select "Windows PowerShell" or "Terminal"
3. Type: `Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"}`

### Option C: Using Settings

1. Press `Win + I` (Settings)
2. Go to **Network & Internet**
3. Click your WiFi connection
4. Scroll down to find **IPv4 address**

**Example IP:** `192.168.1.100`

**💡 Write this IP down!**

---

## Step 2: Configure Windows Firewall (Important!)

Windows Firewall might block connections. Let's allow it:

### Option A: Quick Method (Allow Node.js)

1. Press `Win + R`
2. Type: `wf.msc` and press Enter
3. Click **"Inbound Rules"** on the left
4. Click **"New Rule..."** on the right
5. Select **"Program"** → Next
6. Click **"Browse"** and find Node.js (usually `C:\Program Files\nodejs\node.exe`)
7. Select **"Allow the connection"** → Next
8. Check all boxes (Domain, Private, Public) → Next
9. Name it: "Node.js Dev Server" → Finish

### Option B: Allow Port 3000 Directly

Run this in PowerShell **as Administrator**:

```powershell
New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

## Step 3: Start the Development Server

Open your project folder and run:

```bash
npm run dev
```

You should see:

```
✓ Ready on http://0.0.0.0:3000
```

**Important:** The `-H 0.0.0.0` flag makes the server accessible from other devices on your network.

---

## Step 4: Access from Your Phone

### On Your Phone:

1. **Connect to the same WiFi** as your computer
2. **Open any browser** (Chrome, Safari, Firefox, etc.)
3. **Type this URL** (replace with YOUR IP):

   ```
   http://192.168.1.100:3000
   ```

4. **You should see the app!** 🎉

---

## Step 5: Test the Customer Shop

### Create a Test Tenant (on computer):

1. Open: `http://192.168.1.100:3000` on your computer
2. Go to **Clients** page
3. Click **"Add New Client"**
4. Enter:
   - Business Name: `Test Coffee Shop`
   - (Slug auto-generates: `test-coffee-shop`)
5. Click **"Add Client"**

### Test on Phone:

1. Go to: `http://192.168.1.100:3000/shop/test-coffee-shop`
2. You should see the customer-facing coffee shop! ☕

**Test these features:**

- ✅ Browse menu (when you add menu items)
- ✅ Add items to cart
- ✅ View cart sidebar
- ✅ Go to checkout
- ✅ Complete an order

---

## Troubleshooting

### ❌ Can't connect from phone?

**Check 1: Same WiFi Network**

- Make sure phone and PC are on the same network
- Not separate 2.4GHz and 5GHz networks

**Check 2: Firewall**

- Run the firewall commands above
- Or temporarily disable Windows Firewall to test

**Check 3: IP Address is Correct**

- Re-run `ipconfig` to verify IP
- IP addresses can change when you reconnect to WiFi

**Check 4: Server is Running**

- Make sure `npm run dev` is still running
- Look for "Ready on http://0.0.0.0:3000"

**Check 5: Port 3000 is Available**

- If 3000 is busy, Next.js will use 3001, 3002, etc.
- Check the terminal output for the actual port
- Use that port in your phone's URL

### ❌ "This site can't be reached"?

Try these URLs (replace 192.168.1.100 with YOUR IP):

```
http://192.168.1.100:3000
http://192.168.1.100:3001  (if port changed)
```

### ❌ Slow or not loading?

- Check your WiFi signal strength
- Restart the dev server (`Ctrl+C`, then `npm run dev`)
- Clear phone's browser cache

---

## Advanced: Test with HTTPS (Optional)

If you need HTTPS (for testing PWA features, camera access, etc.):

### Using ngrok (Easiest):

1. **Install ngrok:**

   ```bash
   npm install -g ngrok
   ```

2. **Start dev server:**

   ```bash
   npm run dev
   ```

3. **In another terminal, create tunnel:**

   ```bash
   ngrok http 3000
   ```

4. **Use the HTTPS URL on your phone:**
   ```
   https://abc123.ngrok.io
   ```

**Benefits:**

- ✅ Real HTTPS
- ✅ Access from anywhere (not just local network)
- ✅ Share with others for testing

---

## Testing Checklist

Once you're connected, test these flows:

### Admin Dashboard (on phone or computer):

- [ ] Create tenant
- [ ] Add locations
- [ ] Add categories
- [ ] Add menu items with images
- [ ] Create coupons

### Customer Shop (on phone):

- [ ] Visit `/shop/[tenant-slug]`
- [ ] Browse menu
- [ ] Search for items
- [ ] Filter by category
- [ ] Open item details modal
- [ ] Add item with size/add-ons to cart
- [ ] View cart
- [ ] Update quantities in cart
- [ ] Go to checkout
- [ ] Create account / login
- [ ] Select location
- [ ] Apply coupon code
- [ ] Place order
- [ ] View order confirmation
- [ ] Check points earned

---

## Tips for Mobile Testing

**Responsive Design:**

- Test in both portrait and landscape
- Try different screen sizes

**Touch Interactions:**

- Test scrolling
- Test modals and overlays
- Test form inputs

**Performance:**

- Check loading times
- Watch for layout shifts
- Test image loading

**Browser Testing:**

- Test on Safari (iOS)
- Test on Chrome (Android)
- Test on Firefox Mobile

---

## Next Steps

**Happy with mobile testing?** Consider:

1. **Deploy to Vercel** - Get a permanent URL
2. **Add PWA** - Make it installable like a native app
3. **Use Capacitor** - Build real APK/IPA for app stores

Let me know which direction you want to go! 🚀
