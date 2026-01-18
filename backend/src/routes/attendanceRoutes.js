import express from 'express';
import {
  getAllAttendance,
  getEmployeeAttendance,
  markAttendance,
  deleteAttendance
} from '../controllers/attendanceController.js';

const router = express.Router();

router.route('/')
  .get(getAllAttendance)
  .post(markAttendance);

router.route('/:id')
  .delete(deleteAttendance);

router.route('/employee/:employeeId')
  .get(getEmployeeAttendance);

export default router;
