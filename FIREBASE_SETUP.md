# Firebase Setup Guide 🔥

Your pool cue documentation app is now configured to use **Firebase Firestore** as the database backend. Firebase is easier to set up and has excellent real-time capabilities!

## 🚀 Quick Setup (3 minutes)

### Step 1: Create Firebase Account
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Sign in with your Google account (or create one)
3. Click "Create a project" or "Add project"

### Step 2: Create New Project
1. Enter project details:
   - **Project name**: `pool-cue-docs` (or any name you prefer)
   - **Project ID**: Will be auto-generated (you can customize it)
2. Choose your Google Analytics settings (optional)
3. Click "Create project"
4. Wait 30-60 seconds for project creation

### Step 3: Set Up Firestore Database
1. In your Firebase console, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll secure it later)
4. Select your preferred location (choose closest to you)
5. Click "Done"

### Step 4: Get Your Configuration
1. In Firebase console, click the **gear icon** ⚙️ next to "Project Overview"
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click **"Web"** (</> icon)
5. Enter app nickname: `pool-cue-webapp`
6. Click **"Register app"**
7. Copy the configuration object (it looks like this):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

### Step 5: Configure Environment Variables
1. Open your project folder
2. Edit the `.env.local` file
3. Replace the placeholder values with your Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

### Step 6: Test Your App
1. Restart your development server: `npm run dev`
2. Go to http://localhost:3000/components/ferrules
3. Try adding a ferrule specification
4. If it saves successfully, you're all set! 🎉

## 🔧 Troubleshooting

### "Failed to save ferrule"
- Check your `.env.local` file has correct values from Firebase
- Verify Firestore is enabled in your Firebase project
- Check browser console for detailed error messages

### "Permission denied" errors
- Go to Firebase Console → Firestore Database → Rules
- Make sure rules allow read/write (for development):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Environment variables not working
- Restart your development server after changing `.env.local`
- Make sure `.env.local` is in your project root directory
- Ensure no extra spaces around the `=` signs

## 🚀 Deployment

When you deploy to Vercel:
1. Go to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add all six Firebase environment variables:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
4. Redeploy your project

## 🔐 Security (After Testing)

Once everything works, secure your database:
1. Go to Firebase Console → Firestore Database → Rules
2. Update rules for production:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ferrule_specs/{document} {
      allow read, write: if true; // You can add auth rules later
    }
  }
}
```

## 🎯 Why Firebase is Great

- ✅ **Easier Setup**: No SQL required, just click and configure
- ✅ **Real-time**: Changes sync instantly across devices
- ✅ **Scalable**: Handles growth automatically
- ✅ **Offline Support**: Works even without internet
- ✅ **Free Tier**: Generous limits for personal projects

Your data is automatically backed up and synced across all your devices! 🚀

Need help? The error messages in your browser console will guide you! 🛠️