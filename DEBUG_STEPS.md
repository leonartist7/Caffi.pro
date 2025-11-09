# 🐛 Quick Debug Steps for Blank Page

## Run These Commands in Order:

### 1. Test if .env.local is loaded
```bash
node test-analytics-connection.js
```

**What to look for:**
- ✅ "CONNECTION SUCCESSFUL" = Good!
- ❌ "ERROR: SUPABASE_SERVICE_ROLE_KEY not found" = Fix .env.local
- ❌ "Error querying" = Database/permission issue

---

### 2. Check if dev server is running
```bash
npm run dev
```

**Expected output:**
```
- Local:        http://localhost:3000
- Ready in 2.3s
```

---

### 3. Open browser and check console

1. Go to: `http://localhost:3000/analytics`
2. Press `F12`
3. Look at Console tab

**What you should see:**
- No errors = Good, but might be empty data
- Red errors = Copy them and we'll fix

---

### 4. Check if it's just empty data

If page loads but shows zeros everywhere:
- This is NORMAL if database is empty
- Run the SQL seed script to add test data

---

## Most Common Issues:

### Issue 1: "Module not found"
```bash
npm install
```

### Issue 2: ".env.local not working"
```bash
# Make sure file is named exactly: .env.local
# Make sure it's in /workspace/ (root folder)
# Restart dev server after creating it
```

### Issue 3: "Still blank after everything"

Check browser console. If you see:
- **Nothing** = Page not loading at all
- **"Loading..."** stuck = Supabase query hanging
- **Errors** = Share them with me

---

## Quick Visual Check:

When you open `http://localhost:3000/analytics`, you should see:

1. **First 2-3 seconds**: Loading spinner
2. **Then**: Dashboard with cards and charts (might show zeros if no data)

If you see:
- ❌ **Blank white page** = JavaScript error (check console)
- ❌ **Loading forever** = Supabase connection issue
- ✅ **Dashboard with zeros** = Working! Just needs data

---

## Run This Now:

```bash
# 1. Test connection
node test-analytics-connection.js

# 2. If that works, restart dev server
npm run dev
```

Then share what you see! 🔍


