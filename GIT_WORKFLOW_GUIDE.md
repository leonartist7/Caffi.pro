# 🔄 Git Workflow Guide - VS Code + GitHub + Claude Code Cloud + Vercel

**Your Current Setup:**

- 🖥️ **VS Code (Local)** - Your main development environment
- ☁️ **Claude Code Cloud** - Where I (Claude) make changes
- 🐙 **GitHub** - Your code repository
- 🚀 **Vercel** - Your deployment platform

---

## 🚨 FIXING YOUR CURRENT MERGE CONFLICT

### Step 1: Check What's Conflicted (In VS Code)

1. **Open VS Code** on your local machine
2. **Open the terminal** (Ctrl + ` or View → Terminal)
3. Run this command:

```bash
git status
```

You'll see something like:

```
You have unmerged paths.
  (fix conflicts and run "git commit")

Unmerged paths:
  (use "git add <file>..." to mark resolution)
        both modified:   some-file.tsx
```

### Step 2: See What Files Have Conflicts

Look for files marked with **"both modified"** or **"both added"**.

### Step 3: Resolve Conflicts in VS Code

**Option A: Use VS Code's Merge Editor (Recommended)**

1. **Click on a conflicted file** in the Source Control panel (left sidebar)
2. **VS Code will show conflict markers** like this:

```typescript
<<<<<<< HEAD (Current Change)
// Your local changes
const greeting = "Hello from local";
=======
// Changes from GitHub (Claude's changes)
const greeting = "Hello from Claude";
>>>>>>> branch-name (Incoming Change)
```

3. **Click one of these buttons** above the conflict:
   - **"Accept Current Change"** - Keep YOUR local version
   - **"Accept Incoming Change"** - Use Claude's version from GitHub
   - **"Accept Both Changes"** - Keep both (rarely what you want)
   - **"Compare Changes"** - See side-by-side diff

4. **For this project, I recommend:**
   - **Accept Incoming Change** (Claude's changes) for most files
   - This keeps the latest improvements I made

**Option B: Manual Resolution**

1. Open the conflicted file
2. Delete the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
3. Keep the code you want
4. Save the file

### Step 4: Mark Conflicts as Resolved

After fixing each file:

```bash
git add <filename>
```

Or in VS Code:

- Click the **"+"** next to the file in Source Control panel

### Step 5: Complete the Merge

```bash
git commit -m "Merge: Resolve conflicts with Claude's changes"
```

Or in VS Code:

- Type a commit message in the Source Control panel
- Click the **✓ Commit** button

### Step 6: Push to GitHub

```bash
git push
```

---

## 🎯 RECOMMENDED WORKFLOW (Going Forward)

Here's the **safest workflow** to avoid conflicts:

### **Workflow: VS Code → GitHub → Claude Code → Vercel**

```
┌─────────────┐
│   VS Code   │ ← You write code here
│   (Local)   │
└──────┬──────┘
       │ git push
       ↓
┌─────────────┐
│   GitHub    │ ← Central repository
└──────┬──────┘
       │ auto-deploy
       ↓
┌─────────────┐
│   Vercel    │ ← Auto-deploys from GitHub
└─────────────┘

       ↓ I (Claude) create PRs
┌─────────────┐
│ Claude Code │ ← I work on feature branches
│   (Cloud)   │
└──────┬──────┘
       │ Pull Request
       ↓
┌─────────────┐
│   GitHub    │ ← You review & merge my PRs
└─────────────┘
```

---

## 📝 DAILY WORKFLOW STEPS

### When You Want to Code Locally (VS Code)

**Step 1: Pull Latest Changes**

```bash
git checkout main  # or your main branch
git pull origin main
```

**Step 2: Create a Feature Branch (Optional but Recommended)**

```bash
git checkout -b feature/my-new-feature
```

**Step 3: Make Your Changes**

- Code in VS Code
- Test locally with `npm run dev`

**Step 4: Commit & Push**

```bash
git add .
git commit -m "Add: My new feature"
git push origin feature/my-new-feature
```

**Step 5: Vercel Auto-Deploys**

- Vercel automatically deploys when you push to GitHub
- Check deployment at: https://vercel.com/dashboard

---

### When Claude Makes Changes (Claude Code Cloud)

**What I Do:**

1. I work on a feature branch (e.g., `claude/diagnostic-testing-guide-...`)
2. I commit and push to GitHub
3. I create a Pull Request (PR)

**What You Do:**

1. **Review the PR** on GitHub
2. **Merge the PR** if you approve
3. **Pull the changes** to your local VS Code:

```bash
git checkout main
git pull origin main
```

4. **Vercel auto-deploys** the merged changes

---

## 🔄 SYNCING BETWEEN ENVIRONMENTS

### Before You Start Coding (Every Time!)

**Always pull first to avoid conflicts:**

```bash
git pull origin main
```

### If You Get Conflicts (Like Today)

**Option 1: Accept All Incoming Changes (Safest)**

```bash
git checkout main
git pull origin main
# If conflicts appear:
git checkout --theirs .  # Accept all changes from GitHub
git add .
git commit -m "Merge: Accept incoming changes"
git push
```

**Option 2: Accept All Your Changes**

```bash
git checkout --ours .  # Keep all your local changes
git add .
git commit -m "Merge: Keep local changes"
git push
```

**Option 3: Resolve Manually (Most Control)**

- Use VS Code's merge editor (see Step 3 above)

---

## 🚀 VERCEL AUTO-DEPLOY SETUP

**How It Works:**

1. **You push to GitHub** → Vercel detects the push
2. **Vercel builds** your Next.js app
3. **Vercel deploys** to production/preview

**Check Your Deployments:**

- Dashboard: https://vercel.com/dashboard
- Production URL: Usually `https://caffi-pro.vercel.app` (or your custom domain)

**Branch Previews:**

- Every branch gets a preview URL
- Example: `https://caffi-pro-git-main-yourname.vercel.app`

---

## 🛡️ PREVENTING CONFLICTS

### Rule 1: Always Pull Before You Code

```bash
git pull origin main
```

### Rule 2: Work on Feature Branches

```bash
git checkout -b feature/your-feature-name
```

### Rule 3: Commit Often, Push Regularly

```bash
git add .
git commit -m "Descriptive message"
git push
```

### Rule 4: Review Claude's PRs Before Merging

- Don't auto-merge my PRs
- Check what changed
- Test if needed
- Then merge

---

## 🔍 USEFUL GIT COMMANDS

### Check Status

```bash
git status                    # See what's changed
git log --oneline -10         # See recent commits
git branch -a                 # See all branches
```

### Undo Changes

```bash
git checkout -- <file>        # Discard local changes to a file
git reset --hard HEAD         # Discard ALL local changes (careful!)
git reset --soft HEAD~1       # Undo last commit (keep changes)
```

### Stash Changes (Save for Later)

```bash
git stash                     # Save changes temporarily
git stash pop                 # Restore stashed changes
git stash list                # See all stashes
```

### Update from GitHub

```bash
git fetch origin              # Download latest from GitHub (don't merge)
git pull origin main          # Download + merge latest changes
```

---

## 🎯 QUICK REFERENCE

### When Starting Work

```bash
git pull origin main
```

### When Done Coding

```bash
git add .
git commit -m "Your message"
git push
```

### When Claude Creates a PR

1. Review on GitHub
2. Merge if good
3. `git pull origin main` locally

### When You Get Conflicts

```bash
# See conflicts
git status

# Accept Claude's version (recommended)
git checkout --theirs <file>
git add <file>

# Or use VS Code's merge editor
# Then:
git commit -m "Merge: Resolved conflicts"
git push
```

---

## 🆘 EMERGENCY: Start Fresh

If everything is broken and you want to start over:

**⚠️ WARNING: This deletes local changes!**

```bash
# Save your work first!
git stash

# Get a clean copy from GitHub
git fetch origin
git reset --hard origin/main

# If you want your stashed changes back:
git stash pop
```

---

## 📞 NEED HELP?

If you get stuck:

1. **Check git status:**

   ```bash
   git status
   ```

2. **Ask me (Claude):**
   - Share the error message
   - Share the output of `git status`
   - I'll help you resolve it!

3. **GitHub Desktop (Alternative):**
   - Download GitHub Desktop
   - It has a visual interface for resolving conflicts
   - Easier for beginners

---

## ✅ CURRENT STATE (Right Now)

Based on our git log:

- **Main branch:** Up to date with latest features
- **Your branch:** `claude/diagnostic-testing-guide-01WkBZk7WyZ4d7ozCipHbPLB`
- **Latest commit:** `5300b22 Merge pull request #38`
- **Status:** Clean working tree in cloud

**In VS Code:**

- You have unmerged files
- Follow Step 1-6 above to resolve
- Then you'll be synced!

---

## 🎉 TIP: Use VS Code Git Extension

VS Code has excellent Git support built-in:

1. **Source Control Panel** (Ctrl+Shift+G)
   - See all changes
   - Stage files
   - Commit
   - Push/Pull

2. **GitLens Extension** (Install from Extensions)
   - See who changed what
   - See commit history
   - Compare versions
   - Super helpful!

3. **Git Graph Extension** (Install from Extensions)
   - Visual branch history
   - See all branches
   - Merge visually

---

**Happy coding! Let me know if you get stuck on any step.** 🚀
