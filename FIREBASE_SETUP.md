# Firebase Setup Guide

## Step 1: Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Create a project"
3. Name it "raid-value-calc" (or whatever you prefer)
4. Disable Google Analytics (not needed)
5. Create project

## Step 2: Enable Services
In your Firebase console:
1. **Firestore Database**
   - Go to Build > Firestore Database
   - Click "Create database"
   - Start in test mode
   - Choose location closest to you

2. **Firebase Hosting**
   - Go to Build > Hosting
   - Click "Get started"
   - Follow the setup steps

3. **Cloud Functions** (for admin functionality)
   - Go to Build > Functions
   - Click "Get started"

## Step 3: Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
firebase init
```

## Step 4: Project Structure Changes
- Replace SQLite with Firestore
- Replace Express server with Cloud Functions
- Keep React frontend (will work perfectly)
- Simplify admin authentication

## Benefits for Your Use Case
- **Global CDN**: Fast loading worldwide
- **Real-time updates**: If you want live pack updates later
- **Automatic scaling**: Handles traffic spikes
- **Zero maintenance**: No server management
- **Built-in analytics**: See how people use your app

## Free Tier Limits (More than enough for you)
- **Firestore**: 50k reads, 20k writes per day
- **Hosting**: 10GB storage, 360MB/day transfer
- **Functions**: 2M invocations per month
- **Authentication**: Unlimited users

Your pack analysis app will use maybe 1% of these limits!
