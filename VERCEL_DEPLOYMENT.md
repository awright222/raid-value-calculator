# Vercel Deployment Guide

## Database Options for Vercel

### Option 1: Vercel Postgres (Recommended)
- Built into Vercel platform
- Free tier: 60 hours compute, 256MB storage
- Auto-scaling and managed
- Easy integration with your project

**Setup:**
1. Go to your Vercel project dashboard
2. Click "Storage" tab
3. Create new Postgres database
4. Copy connection string to environment variables

### Option 2: Supabase (Free PostgreSQL)
- Free tier: 500MB database, 50MB file storage
- Real-time subscriptions
- Built-in authentication (if needed later)
- API auto-generation

**Setup:**
1. Sign up at supabase.com
2. Create new project
3. Get connection string from project settings
4. Add to Vercel environment variables

### Option 3: PlanetScale (MySQL)
- Free tier: 1 database, 5GB storage
- Serverless MySQL platform
- Branch-based development
- No connection limits

### Option 4: Railway Postgres
- Free tier: $5 credit per month
- Simple setup
- Good for small projects

## Environment Variables Needed

```
DATABASE_URL=postgresql://user:pass@host:port/dbname
ADMIN_PASSWORD=your_admin_password
NODE_ENV=production
```

## Database Schema Migration

You'll need to update the database initialization to work with PostgreSQL instead of SQLite.

The current SQLite schema:
```sql
CREATE TABLE IF NOT EXISTS packs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  energy_pots INTEGER DEFAULT 0,
  raw_energy INTEGER DEFAULT 0,
  total_energy INTEGER NOT NULL,
  cost_per_energy REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

PostgreSQL equivalent:
```sql
CREATE TABLE IF NOT EXISTS packs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  energy_pots INTEGER DEFAULT 0,
  raw_energy INTEGER DEFAULT 0,
  total_energy INTEGER NOT NULL,
  cost_per_energy DECIMAL(10,6) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Recommended Approach

1. **Use Vercel Postgres** for simplicity
2. **Update server.js** to use PostgreSQL instead of SQLite
3. **Add database connection** using environment variables
4. **Test locally** with PostgreSQL before deploying
