# 🛡️ Security Setup Instructions

## **IMPORTANT: Before Public Deployment**

### 1. **Environment Variables Setup**
Copy `.env.template` to `.env.local` and fill in your Firebase configuration:

```bash
cp .env.template .env.local
```

Edit `.env.local` with your Firebase project credentials.

### 2. **Admin Password**
Change the `VITE_ADMIN_PASSWORD` in your `.env.local` to a strong password.

### 3. **Firebase Security Rules**
Ensure your Firestore rules are properly configured:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read access for pack data
    match /packs/{document} {
      allow read: if true;
      allow write: if false; // Only admin can write
    }
    
    // Community submissions
    match /pending_packs/{document} {
      allow read, write: if true; // Community can submit
    }
    
    // Analytics (optional)
    match /analytics/{document} {
      allow write: if true;
      allow read: if false;
    }
  }
}
```

### 4. **Production Deployment**
For production (Vercel, Netlify, etc.), set these environment variables:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_ADMIN_PASSWORD`

### 5. **Security Checklist**
- [ ] No hardcoded credentials in source code
- [ ] All `.env*` files in `.gitignore`
- [ ] Strong admin password set
- [ ] Firebase security rules configured
- [ ] HTTPS enabled in production
- [ ] Environment variables set in hosting platform

## **Files to Never Commit**
- `.env.local`
- `.env.production`
- Any file with API keys or passwords
- `debug-*.js` files
- `fix-*.js` files with credentials

## **Rotating Compromised Keys**
If any credentials are exposed:
1. Generate new Firebase API keys
2. Update Firebase project settings
3. Update environment variables
4. Redeploy application
