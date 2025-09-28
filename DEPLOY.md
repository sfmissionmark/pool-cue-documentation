# Firebase Hosting Auto-Deploy Setup 🔥

Your GitHub repository is now configured to automatically deploy to Firebase Hosting on every push to the `main` branch.

## 🚀 Setup Steps

### Step 1: Create Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your `pool-cue-documentation` project
3. Go to **Project Settings** (gear icon) → **Service Accounts**
4. Click **"Generate new private key"**
5. Download the JSON file

### Step 2: Add GitHub Secrets

1. Go to your GitHub repository: `https://github.com/sfmissionmark/pool-cue-documentation`
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Add these repository secrets:

#### Firebase Service Account:
- Name: `FIREBASE_SERVICE_ACCOUNT_POOL_CUE_DOCUMENTATION`
- Value: Copy the entire contents of the JSON file you downloaded

#### Firebase Config (from your Firebase project settings):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Step 3: Enable Firebase Hosting

1. In Firebase Console, go to **Hosting**
2. Click **"Get started"**
3. Follow the setup (the configuration is already done)

## 🎯 How It Works

1. **Push to GitHub** → Triggers GitHub Action
2. **Build Process** → Next.js builds static site
3. **Deploy** → Files uploaded to Firebase Hosting
4. **Live Site** → Available at `https://pool-cue-documentation.web.app`

## 🔧 Manual Deploy (Optional)

If you want to deploy manually:
```bash
npm run build
firebase deploy --only hosting
```

## ✅ What's Configured

- ✅ GitHub Actions workflow (`.github/workflows/firebase-hosting.yml`)
- ✅ Firebase hosting config (`firebase.json`)
- ✅ Next.js static export (`next.config.ts`)
- ✅ Auto-deploy on push to main branch
- ✅ Environment variables for Firebase config

Your site will be live at: **https://pool-cue-documentation.web.app**

Once you add the secrets, push any change to trigger the first deployment! 🚀