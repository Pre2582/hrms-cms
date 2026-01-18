# Deployment Guide - HRMS Lite

This guide provides step-by-step instructions for deploying the HRMS Lite application to production.

## Deployment Architecture

- **Frontend**: Vercel or Netlify (Static hosting)
- **Backend**: Render or Railway (Node.js hosting)
- **Database**: MongoDB Atlas (Cloud database)

---

## Step 1: Deploy MongoDB Database

### Using MongoDB Atlas (Recommended)

1. **Create an Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account

2. **Create a Cluster**
   - Click "Create" to create a new cluster
   - Choose the free M0 tier
   - Select a cloud provider and region close to your users
   - Click "Create Cluster"

3. **Configure Database Access**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Create a username and strong password (save these!)
   - Grant "Read and write to any database" permission

4. **Configure Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0) for development
   - For production, add specific IPs of your backend server

5. **Get Connection String**
   - Go to "Database" and click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Save this connection string for backend deployment

---

## Step 2: Deploy Backend API

### Option A: Deploy to Render

1. **Prepare Backend**
   - Ensure `package.json` has a start script: `"start": "node server.js"`
   - Commit all backend code to Git

2. **Create Render Account**
   - Go to [Render](https://render.com)
   - Sign up with GitHub

3. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure the service:
     - **Name**: hrms-lite-backend
     - **Environment**: Node
     - **Region**: Choose closest to your users
     - **Branch**: main (or your default branch)
     - **Root Directory**: backend
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`

4. **Add Environment Variables**
   - Click "Environment" tab
   - Add the following variables:
     ```
     PORT=5000
     MONGODB_URI=<your-mongodb-atlas-connection-string>
     NODE_ENV=production
     ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Copy the deployed URL (e.g., `https://hrms-lite-backend.onrender.com`)

### Option B: Deploy to Railway

1. **Create Railway Account**
   - Go to [Railway](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Service**
   - Select the backend directory
   - Railway will auto-detect Node.js

4. **Add Environment Variables**
   - Go to "Variables" tab
   - Add:
     ```
     MONGODB_URI=<your-mongodb-atlas-connection-string>
     NODE_ENV=production
     ```

5. **Deploy**
   - Railway will automatically deploy
   - Copy the public URL from Settings

---

## Step 3: Deploy Frontend

### Option A: Deploy to Vercel

1. **Prepare Frontend**
   - Update `frontend/.env` with your backend URL:
     ```
     VITE_API_URL=https://your-backend-url.onrender.com/api
     ```

2. **Create Vercel Account**
   - Go to [Vercel](https://vercel.com)
   - Sign up with GitHub

3. **Import Project**
   - Click "Add New" → "Project"
   - Import your Git repository
   - Vercel will auto-detect Vite

4. **Configure Build Settings**
   - **Framework Preset**: Vite
   - **Root Directory**: frontend
   - **Build Command**: `npm run build`
   - **Output Directory**: dist

5. **Add Environment Variables**
   - Add the following variable:
     ```
     VITE_API_URL=https://your-backend-url.onrender.com/api
     ```

6. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your app will be live at `https://your-app.vercel.app`

### Option B: Deploy to Netlify

1. **Create Netlify Account**
   - Go to [Netlify](https://netlify.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub and select your repository

3. **Configure Build Settings**
   - **Base directory**: frontend
   - **Build command**: `npm run build`
   - **Publish directory**: frontend/dist

4. **Add Environment Variables**
   - Go to "Site settings" → "Environment variables"
   - Add:
     ```
     VITE_API_URL=https://your-backend-url.onrender.com/api
     ```

5. **Deploy**
   - Click "Deploy site"
   - Your app will be live at a Netlify URL

---

## Step 4: Update Backend CORS

After deploying the frontend, update your backend to allow CORS from your frontend domain.

**In `backend/server.js`:**

```javascript
// Update CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-app.vercel.app',  // Add your frontend URL
    'https://your-app.netlify.app'  // Or Netlify URL
  ],
  credentials: true
}));
```

Redeploy your backend after this change.

---

## Step 5: Test Deployment

1. **Visit your frontend URL**
2. **Test all features**:
   - Add an employee
   - View employees list
   - Delete an employee
   - Mark attendance
   - Filter attendance records
   - Check error handling

---

## Continuous Deployment

Both Vercel/Netlify and Render/Railway support automatic deployments:

- Push to your main branch → Automatic deployment
- Pull requests create preview deployments
- Rollback to previous deployments if needed

---

## Environment Variables Summary

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hrms_lite
NODE_ENV=production
```

### Frontend (.env)
```
VITE_API_URL=https://your-backend-url.onrender.com/api
```

---

## Monitoring & Maintenance

### Backend Monitoring
- Check logs in Render/Railway dashboard
- Monitor response times
- Set up alerts for downtime

### Database Monitoring
- Monitor MongoDB Atlas metrics
- Check storage usage
- Review slow queries

### Frontend Monitoring
- Check Vercel/Netlify analytics
- Monitor build times
- Review deployment logs

---

## Troubleshooting

### CORS Errors
- Ensure backend CORS is configured with frontend URL
- Check that HTTPS is used in production

### Database Connection Errors
- Verify MongoDB connection string
- Check network access settings in Atlas
- Ensure database user has correct permissions

### Build Failures
- Check Node.js version compatibility
- Verify all dependencies are in package.json
- Review build logs for specific errors

### API Errors
- Check backend logs
- Verify environment variables are set
- Test API endpoints directly

---

## Cost Estimates

- **MongoDB Atlas**: Free (M0 tier, 512MB)
- **Render**: Free tier available (may sleep after inactivity)
- **Railway**: $5/month credit (free tier)
- **Vercel**: Free for personal projects
- **Netlify**: Free for personal projects

**Total**: $0-5/month for small-scale deployment

---

## Security Checklist

- [ ] Use strong database passwords
- [ ] Enable MongoDB Atlas IP whitelist
- [ ] Set NODE_ENV=production
- [ ] Use HTTPS for all connections
- [ ] Keep dependencies updated
- [ ] Don't commit .env files
- [ ] Use environment variables for secrets
- [ ] Enable CORS only for your frontend domain

---

## Support

For deployment issues:
- Render: https://render.com/docs
- Railway: https://docs.railway.app
- Vercel: https://vercel.com/docs
- Netlify: https://docs.netlify.com
- MongoDB Atlas: https://docs.atlas.mongodb.com
