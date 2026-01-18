# HRMS Lite - Human Resource Management System

A lightweight, full-stack web application for managing employee records and tracking daily attendance. Built with React, Node.js/Express, and MongoDB.

## Features

### Employee Management
- Add new employees with unique Employee ID
- View all employees in a sortable table
- Delete employees (with cascade deletion of attendance records)
- Input validation (email format, required fields, duplicate checks)

### Attendance Management
- Mark daily attendance (Present/Absent)
- View attendance records for all employees
- Filter attendance by employee and/or date
- Automatic duplicate prevention (one record per employee per day)
- Display total present days per employee

### UI/UX Features
- Clean, professional interface with Tailwind CSS
- Responsive design for all screen sizes
- Loading states for async operations
- Empty states with helpful guidance
- Error handling with user-friendly messages
- Confirmation dialogs for destructive actions
- Modal forms for data entry

## Tech Stack

### Frontend
- **React** 19.2.0 - UI framework
- **Vite** 7.2.4 - Build tool and dev server
- **React Router** 6.20.1 - Client-side routing
- **Axios** 1.6.2 - HTTP client
- **Tailwind CSS** 3.3.6 - Utility-first CSS framework

### Backend
- **Node.js** - Runtime environment
- **Express** 4.18.2 - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** 8.0.3 - ODM for MongoDB
- **CORS** 2.8.5 - Cross-origin resource sharing
- **dotenv** 16.3.1 - Environment variable management
- **express-validator** 7.0.1 - Request validation

## Project Structure

```
HRMS Lite/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # MongoDB connection
│   │   ├── controllers/
│   │   │   ├── employeeController.js
│   │   │   └── attendanceController.js
│   │   ├── models/
│   │   │   ├── Employee.js
│   │   │   └── Attendance.js
│   │   ├── routes/
│   │   │   ├── employeeRoutes.js
│   │   │   └── attendanceRoutes.js
│   │   └── middleware/
│   │       └── errorHandler.js
│   ├── server.js                    # Entry point
│   ├── package.json
│   ├── .env                         # Environment variables
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   └── ErrorMessage.jsx
│   │   ├── pages/
│   │   │   ├── Employees.jsx
│   │   │   └── Attendance.jsx
│   │   ├── services/
│   │   │   └── api.js               # API client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── .env                         # Environment variables
│   └── .env.example
│
└── README.md
```

## API Endpoints

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create new employee
- `DELETE /api/employees/:id` - Delete employee

### Attendance
- `GET /api/attendance` - Get all attendance records (supports ?employeeId and ?date filters)
- `GET /api/attendance/employee/:employeeId` - Get attendance for specific employee
- `POST /api/attendance` - Mark attendance
- `DELETE /api/attendance/:id` - Delete attendance record

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd "HRMS Lite"
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Update .env with your MongoDB connection string
# For local MongoDB:
MONGODB_URI=mongodb://localhost:27017/hrms_lite

# For MongoDB Atlas:
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/hrms_lite

# Start the server
npm start

# Or for development with auto-reload
npm run dev
```

The backend server will start on `http://localhost:5000`

### 3. Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Update .env if needed (default points to localhost:5000)
VITE_API_URL=http://localhost:5000/api

# Start the development server
npm run dev
```

The frontend will start on `http://localhost:5173` (or another port if 5173 is busy)

### 4. Access the Application

Open your browser and navigate to `http://localhost:5173`

## Building for Production

### Backend
```bash
cd backend
npm start
```

### Frontend
```bash
cd frontend
npm run build
```

The build output will be in the `frontend/dist` directory, ready to be deployed to any static hosting service.

## Deployment

### Recommended Deployment Platforms

#### Backend
- **Render** - https://render.com
- **Railway** - https://railway.app
- **Heroku** - https://heroku.com

#### Frontend
- **Vercel** - https://vercel.com
- **Netlify** - https://netlify.com

#### Database
- **MongoDB Atlas** - https://www.mongodb.com/atlas (Free tier available)

### Environment Variables for Production

**Backend (.env):**
```
PORT=5000
MONGODB_URI=<your-mongodb-atlas-connection-string>
NODE_ENV=production
```

**Frontend (.env):**
```
VITE_API_URL=<your-deployed-backend-url>/api
```

## Usage Guide

### Adding an Employee
1. Click "Add Employee" button
2. Fill in the form with:
   - Unique Employee ID (e.g., EMP001)
   - Full Name
   - Valid Email Address
   - Department
3. Click "Add Employee"

### Deleting an Employee
1. Click "Delete" button next to the employee
2. Confirm the deletion
3. Note: All attendance records for this employee will also be deleted

### Marking Attendance
1. Navigate to "Attendance" tab
2. Click "Mark Attendance"
3. Select employee from dropdown
4. Choose date (defaults to today)
5. Select status (Present/Absent)
6. Click "Mark Attendance"

### Viewing Attendance Records
1. Navigate to "Attendance" tab
2. Use filters to narrow results:
   - Filter by specific employee
   - Filter by specific date
3. Click "Clear Filters" to reset

## Validation & Error Handling

### Server-side Validation
- Required fields validation
- Email format validation
- Duplicate Employee ID/Email prevention
- Valid date and status values for attendance
- Employee existence check before marking attendance

### Client-side Validation
- Form field requirements
- Email format checking
- User-friendly error messages
- Confirmation dialogs for destructive actions

## Assumptions & Limitations

### Assumptions
- Single admin user (no authentication system)
- No employee editing functionality (delete and re-add instead)
- Attendance can be marked for any date (past, present, future)
- One attendance record per employee per day

### Limitations
- No user authentication or authorization
- No employee profile pictures
- No payroll calculations
- No leave management
- No reporting or analytics dashboard
- No export functionality (CSV, PDF, etc.)

## Future Enhancements (Out of Scope)

- User authentication and role-based access control
- Employee profile editing
- Advanced reporting and analytics
- Leave management system
- Payroll integration
- Email notifications
- Attendance history visualization
- Export to CSV/PDF
- Mobile app

## Contributing

This is an assessment project. For any questions or issues, please contact the repository owner.

## License

MIT License - Feel free to use this code for educational purposes.

---

**Developed as part of Full-Stack Coding Assignment - HRMS Lite**
