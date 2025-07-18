# Firebase Cost Protection Setup Guide

## 🚨 Critical: Set Up Firebase Billing Alerts

### 1. Firebase Console Budget Alerts
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click "Usage and billing" in left sidebar
4. Click "Details & settings"
5. Click "Manage billing account"
6. Go to "Budgets & alerts"
7. Create a new budget:
   - **Budget amount**: $5-10/month (adjust as needed)
   - **Alert thresholds**: 50%, 90%, 100%
   - **Email notifications**: Your email address

### 2. Firestore Daily Usage Limits
1. In Firebase Console → Firestore Database
2. Go to "Usage" tab
3. Set daily spending limits:
   - **Document reads**: 50,000/day (free tier: 50,000)
   - **Document writes**: 20,000/day (free tier: 20,000)
   - **Document deletes**: 20,000/day (free tier: 20,000)

### 3. App Engine Quotas (if using Cloud Functions)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to "IAM & Admin" → "Quotas"
4. Search for "Cloud Firestore API"
5. Set reasonable limits for your usage

## 📊 Current Protection Measures Implemented

### Client-Side Rate Limiting
- **Pack Analysis**: 5 per minute per user
- **Pack Submission**: 2 per minute per user
- **Analytics Events**: 20 per minute per user
- **Data Fetching**: 30 per minute per user

### Firestore Security Rules
- **Data validation**: Pack prices must be $0.01-$1000
- **Field limits**: Max 50 fields per document write
- **Size limits**: Max 200 characters for pack names
- **Event restrictions**: Only specific analytics event types allowed

### Database Design Optimizations
- **Indexed queries**: All queries use proper indexes
- **Batch operations**: Multiple operations bundled together
- **Caching**: Pricing data cached to reduce reads
- **Cleanup**: Automatic removal of old/expired data

## 💰 Expected Firebase Costs

### Free Tier Limits (Spark Plan)
- **Firestore reads**: 50,000/day
- **Firestore writes**: 20,000/day  
- **Firestore deletes**: 20,000/day
- **Storage**: 1 GB
- **Bandwidth**: 10 GB/month

### Typical Usage Estimates
With 100 daily active users:
- **Pack analyses**: ~500 writes/day
- **Analytics events**: ~2,000 writes/day
- **Data reads**: ~10,000 reads/day
- **Historical data**: ~100 writes/day

**Total estimated monthly cost: $0-2** (likely stays in free tier)

## 🛡️ Emergency Cost Protection

### If Costs Spike
1. **Immediate**: Disable writes in Firestore rules
2. **Check**: Firebase Console usage graphs
3. **Investigate**: Check for unusual patterns
4. **Contact**: Firebase support if needed

### Kill Switch (Emergency)
Add this to your Firestore rules to stop all writes:
```javascript
// EMERGENCY: Disable all writes
match /{document=**} {
  allow read: if true;
  allow write: if false; // Blocks all writes
}
```

## 📈 Monitoring Dashboard

Check these regularly:
1. **Firebase Console → Usage**: Daily read/write counts
2. **Cloud Console → Billing**: Current spend
3. **Your app analytics**: User behavior patterns
4. **Firestore → Usage**: Real-time usage metrics

## 🚀 Scaling Considerations

When you need to scale up:
1. **Upgrade to Blaze plan**: Pay-as-you-go pricing
2. **Implement Cloud Functions**: Server-side rate limiting
3. **Add CDN**: Cache static content (Cloudflare)
4. **Database sharding**: Split data across regions
5. **Professional monitoring**: Datadog, New Relic, etc.

## ⚠️ Red Flags to Watch For

- **Sudden spike in writes** (>10x normal)
- **Unusual read patterns** (scraping behavior)
- **Large document sizes** (>1MB per document)
- **Repeated failed operations** (retry loops)
- **Geographic anomalies** (traffic from unexpected regions)

Remember: **Prevention is cheaper than mitigation!**
