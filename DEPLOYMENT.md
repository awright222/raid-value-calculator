# Deployment Guide

This guide will help you deploy your Raid Value Calculator to the web so you can access it from anywhere without needing to run VS Code.

## Quick Deployment Options

### Option 1: Railway (Recommended - Easy)
1. Go to [Railway.app](https://railway.app) and sign up with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your RaidValueCalc repository
4. Add environment variables:
   - `ADMIN_PASSWORD` = `your-secure-password-here`
   - `NODE_ENV` = `production`
5. Railway will automatically deploy and give you a URL

### Option 2: Render (Free tier available)
1. Go to [Render.com](https://render.com) and sign up with GitHub
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Use these settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `ADMIN_PASSWORD` = `your-secure-password-here`
     - `NODE_ENV` = `production`

### Option 3: Vercel + PlanetScale (More advanced)
1. Frontend on Vercel, Database on PlanetScale
2. Requires converting SQLite to MySQL/PostgreSQL

## Environment Variables You Need

```env
ADMIN_PASSWORD=your-super-secure-password-here
NODE_ENV=production
PORT=3001
```

## Production Checklist

- [ ] Change the default admin password in `.env`
- [ ] Test the app locally with `npm run dev`
- [ ] Build for production with `npm run build`
- [ ] Deploy to your chosen platform
- [ ] Test admin login on the live site
- [ ] Add some starter pack data

## How It Works

1. **Public Access**: Anyone can visit your URL and analyze pack values
2. **Admin Access**: Only you know the admin password to add new packs
3. **Shared Database**: All users benefit from the pack data you add
4. **Automatic Grading**: Pack values are automatically graded as you add more reference data

## Security Notes

- The admin password is stored as an environment variable
- Sessions are temporary and stored in memory
- Only pack data is stored in the database (no personal information)
- HTTPS is automatically provided by deployment platforms

## Managing Your App

Once deployed, you can:
- Access admin features from any browser by entering your password
- Add new pack data that immediately becomes available to all users
- Monitor usage through your deployment platform's dashboard
- Update the app by pushing changes to your GitHub repository

## Troubleshooting

**Can't log in as admin?**
- Check that ADMIN_PASSWORD environment variable is set correctly
- Try clearing browser cache/cookies

**Database not persisting?**
- Some platforms require persistent storage setup
- Check platform documentation for database persistence

**App not loading?**
- Check deployment logs in your platform dashboard
- Ensure all environment variables are set

---

**Ready to deploy?** Choose one of the options above and you'll have your Raid Value Calculator running on the web in minutes!
