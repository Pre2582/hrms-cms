# Quick Start Guide

Get HRMS Lite up and running in 5 minutes!

## Prerequisites

- Node.js installed (v14+)
- MongoDB installed locally OR MongoDB Atlas account
- Git installed

## Step 1: Clone & Install (2 minutes)

```bash
# Clone the repository
git clone <your-repo-url>
cd "HRMS Lite"

# Install all dependencies (both backend and frontend)
npm run install-all
```

## Step 2: Configure Environment (1 minute)

### Backend Configuration
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hrms_lite
NODE_ENV=development
```

For MongoDB Atlas, use:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hrms_lite
```

### Frontend Configuration
```bash
cd ../frontend
cp .env.example .env
```

The default settings should work:
```
VITE_API_URL=http://localhost:5000/api
```

## Step 3: Start MongoDB (if using local)

```bash
# Start MongoDB service
mongod

# Or if using MongoDB as a service:
# Windows: Already running as a service
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

## Step 4: Run the Application (1 minute)

### Terminal 1 - Start Backend
```bash
cd backend
npm run dev
```

You should see:
```
Server running in development mode on port 5000
MongoDB Connected: localhost
```

### Terminal 2 - Start Frontend
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v7.2.4  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## Step 5: Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## Test the Application

1. **Add an Employee**
   - Click "Add Employee"
   - Fill in: EMP001, John Doe, john@example.com, Engineering
   - Click "Add Employee"

2. **Mark Attendance**
   - Go to "Attendance" tab
   - Click "Mark Attendance"
   - Select the employee, choose today's date, status "Present"
   - Click "Mark Attendance"

3. **View Records**
   - View employees in the table
   - Filter attendance by employee or date

## Common Issues

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB is running

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**: Change PORT in backend/.env to another port (e.g., 5001)

### Frontend Can't Connect to Backend
**Solution**:
- Ensure backend is running on port 5000
- Check VITE_API_URL in frontend/.env
- Check browser console for CORS errors

## Next Steps

- Deploy to production (see DEPLOYMENT.md)
- Customize the application
- Add more features

## Need Help?

Check the full README.md for detailed documentation.
