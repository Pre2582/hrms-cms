import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './src/config/database.js';
import authRoutes from './src/routes/authRoutes.js';
import employeeRoutes from './src/routes/employeeRoutes.js';
import attendanceRoutes from './src/routes/attendanceRoutes.js';
import leaveRoutes from './src/routes/leaveRoutes.js';
import payrollRoutes from './src/routes/payrollRoutes.js';
import performanceRoutes from './src/routes/performanceRoutes.js';
import documentRoutes from './src/routes/documentRoutes.js';
import { protect } from './src/middleware/auth.js';
import errorHandler from './src/middleware/errorHandler.js';

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://hrms-cms.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'HRMS Lite API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      employees: '/api/employees',
      attendance: '/api/attendance',
      leave: '/api/leave',
      payroll: '/api/payroll',
      performance: '/api/performance',
      documents: '/api/documents'
    }
  });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/employees', protect, employeeRoutes);
app.use('/api/attendance', protect, attendanceRoutes);
app.use('/api/leave', protect, leaveRoutes);
app.use('/api/payroll', protect, payrollRoutes);
app.use('/api/performance', protect, performanceRoutes);
app.use('/api/documents', protect, documentRoutes);

// Error handling middleware
app.use(errorHandler);

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

export default app;
