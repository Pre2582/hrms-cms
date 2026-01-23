import express from 'express';
import {
  getAllAttendance,
  getEmployeeAttendance,
  markAttendance,
  updateAttendance,
  deleteAttendance,
  punchIn,
  punchOut,
  getTodayPunchStatus,
  getCalendarData,
  requestCorrection,
  getPendingCorrections,
  processCorrectionRequest,
  getAttendanceStats
} from '../controllers/attendanceController.js';

const router = express.Router();

// Calendar and stats routes (must be before /:id to avoid conflicts)
router.get('/calendar', getCalendarData);
router.get('/stats', getAttendanceStats);

// Punch in/out routes
router.post('/punch-in', punchIn);
router.post('/punch-out', punchOut);
router.get('/punch-status/:employeeId', getTodayPunchStatus);

// Correction request routes
router.post('/correction', requestCorrection);
router.get('/corrections/pending', getPendingCorrections);
router.put('/corrections/:id/process', processCorrectionRequest);

// Employee attendance route (must be before /:id)
router.get('/employee/:employeeId', getEmployeeAttendance);

// Base routes
router.route('/')
  .get(getAllAttendance)
  .post(markAttendance);

router.route('/:id')
  .put(updateAttendance)
  .delete(deleteAttendance);

export default router;
