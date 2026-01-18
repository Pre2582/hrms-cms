# Authentication System - Complete Setup Guide

## 🎉 What's Been Implemented

### Backend (Complete)
✅ JWT-based authentication
✅ Login endpoint with admin credentials
✅ Token verification middleware
✅ Protected routes for employees and attendance
✅ Secure token generation and validation

### Frontend (Complete)
✅ Login page with professional UI
✅ AuthContext for state management
✅ Protected routes wrapper
✅ Token storage in localStorage
✅ Automatic token injection in API calls
✅ Unauthorized response handling
✅ Logout functionality
✅ Toast notifications for all operations

---

## 🔐 Default Admin Credentials

```
Username: admin
Password: admin123
```

---

## 🏗️ Architecture

### Backend Authentication Flow
1. User submits login credentials
2. Server validates username/password
3. JWT token generated (24h expiration)
4. Token returned to client
5. Client includes token in all subsequent requests
6. Middleware verifies token on protected routes

### Frontend Auth Flow
1. User lands on login page (default route)
2. After successful login, token stored in localStorage
3. User redirected to dashboard
4. All API calls include Authorization header
5. On 401 response, user redirected to login
6. Logout clears token and redirects to login

---

## 📁 New Files Created

### Backend
```
backend/src/controllers/authController.js      # Login, verify, logout
backend/src/middleware/auth.js                 # JWT verification
backend/src/routes/authRoutes.js              # Auth endpoints
backend/server.js                             # Updated with auth routes
backend/.env                                   # Added JWT_SECRET
```

### Frontend
```
frontend/src/context/AuthContext.jsx          # Auth state management
frontend/src/components/ProtectedRoute.jsx     # Route protection
frontend/src/pages/Login.jsx                  # Login page UI
frontend/src/services/api.js                  # Updated with interceptors
frontend/src/App.jsx                          # Updated routing
frontend/src/components/Layout.jsx            # Added logout button
frontend/src/pages/Employees.jsx               # Added toast notifications
frontend/src/pages/Attendance.jsx             # Added toast notifications
```

---

## 🔄 How to Restart & Test

### Step 1: Stop Current Servers
```bash
# Press Ctrl+C in both terminal windows
# Or close the terminals
```

### Step 2: Start Backend
```bash
cd backend
npm start
```

**Expected output:**
```
Server running in development mode on port 5000
MongoDB Connected: localhost
```

### Step 3: Start Frontend
```bash
cd frontend
npm run dev
```

**Expected output:**
```
VITE v5.4.21  ready in XXX ms
➜  Local:   http://localhost:5173/
```

### Step 4: Test the Application
1. Open browser: `http://localhost:5173`
2. Should automatically redirect to `/login`
3. Enter credentials:
   - Username: `admin`
   - Password: `admin123`
4. Click "Login"
5. Success toast appears
6. Redirected to Dashboard

---

## 🎯 Features & Testing

### Login Page
- Professional gradient blue background
- Company logo and branding
- Username/password fields
- Demo credentials displayed
- Error messages for invalid login
- Loading state during login
- Toast notification on success/error

### Protected Routes
✅ `/` - Dashboard (requires auth)
✅ `/employees` - Employee Management (requires auth)
✅ `/attendance` - Attendance Management (requires auth)
✅ `/login` - Public route

**Without token → Redirected to login**
**With valid token → Access granted**
**With expired token → Redirected to login**

### Logout
- Click "Logout" button in sidebar footer
- Token removed from localStorage
- Redirected to login page
- Toast notification: "Logged out successfully"

### Toast Notifications
✅ Login success/failure
✅ Employee created successfully
✅ Employee deleted successfully
✅ Attendance marked successfully
✅ All error messages
✅ Logout confirmation

---

## 🔌 API Endpoints

### Public Endpoints
```
POST /api/auth/login
Body: { "username": "admin", "password": "admin123" }
Response: { "success": true, "token": "jwt-token", "user": {...} }
```

### Protected Endpoints (Require Authorization Header)
```
GET    /api/employees
POST   /api/employees
DELETE /api/employees/:id

GET    /api/attendance
POST   /api/attendance
GET    /api/attendance/employee/:employeeId
```

**Authorization Header Format:**
```
Authorization: Bearer <jwt-token>
```

---

## 🧪 Testing the Auth System

### Test 1: Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Expected:** JWT token returned

### Test 2: Access Protected Route Without Token
```bash
curl http://localhost:5000/api/employees
```

**Expected:** 401 Unauthorized

### Test 3: Access Protected Route With Token
```bash
curl http://localhost:5000/api/employees \
  -H "Authorization: Bearer <your-token-here>"
```

**Expected:** Employee list returned

---

## 🎨 Toast Notifications

### Position & Style
- **Position**: Top-right corner
- **Auto-close**: 3 seconds
- **Theme**: Light
- **Types**:
  - ✅ Success (green)
  - ❌ Error (red)
  - ℹ️ Info (blue)

### When They Appear
| Action | Notification |
|--------|--------------|
| Login success | "Login successful! Welcome back." |
| Login failure | "Invalid credentials" |
| Employee created | "Employee [Name] created successfully!" |
| Employee deleted | "Employee [Name] deleted successfully!" |
| Attendance marked | "Attendance marked as [Status] for [Name]" |
| Logout | "Logged out successfully" |
| Any error | Specific error message from API |

---

## 🔒 Security Features

### Backend
✅ JWT tokens with 24h expiration
✅ Passwords validated (ready for bcrypt hashing)
✅ Protected routes with middleware
✅ CORS configured
✅ Error messages don't leak sensitive info
✅ Token verification on every request

### Frontend
✅ Token stored securely in localStorage
✅ Automatic token inclusion in requests
✅ Token removed on logout
✅ Redirect on unauthorized (401)
✅ Protected route wrapper
✅ No sensitive data in URL params

---

## 📱 User Experience Flow

### First Visit
1. User opens `http://localhost:5173`
2. No token found → Redirect to `/login`
3. See beautiful login page
4. Enter credentials
5. Click Login button
6. Toast: "Login successful!"
7. Redirect to Dashboard
8. See welcome message and stats

### Using the App
1. Navigate using sidebar
2. All features work normally
3. All actions show toast notifications
4. User info shown in sidebar footer

### Logging Out
1. Click "Logout" button in sidebar
2. Toast: "Logged out successfully"
3. Token cleared
4. Redirect to login
5. Must login again to access app

---

## 🚀 Ready for Deployment

### Backend Environment Variables
```env
PORT=5000
MONGODB_URI=your-mongodb-uri
NODE_ENV=production
JWT_SECRET=super-secret-key-change-this-in-production
```

### Frontend Environment Variables
```env
VITE_API_URL=https://your-backend-url.com/api
```

---

## 💡 Future Enhancements (Optional)

- [ ] Remember me checkbox (longer token expiration)
- [ ] Password reset functionality
- [ ] Email verification
- [ ] Two-factor authentication
- [ ] Refresh tokens
- [ ] Role-based access control (multiple user roles)
- [ ] Session timeout warning
- [ ] Login activity log
- [ ] Failed login attempt tracking

---

## 📝 Admin Credentials Summary

For easy reference:

| Field | Value |
|-------|-------|
| Username | admin |
| Password | admin123 |
| Email | admin@hrms.com |
| Role | admin |

---

## ✅ Checklist

Before testing, ensure:
- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 5173
- [ ] MongoDB connected
- [ ] No console errors
- [ ] Token included in API calls
- [ ] Login page loads
- [ ] Toast notifications appear

---

**Status**: ✅ Authentication system fully implemented!

**Next Step**: Restart both servers and test at http://localhost:5173
