import express from 'express';
import {
    getLeaveTypes, createLeaveType, updateLeaveType, initializeLeaveTypes,
    getLeaveBalance, getAllLeaveBalances, initializeAllBalances,
    applyLeave, getLeaveRequests, processLeaveRequest, cancelLeaveRequest,
    getHolidays, createHoliday, updateHoliday, deleteHoliday, initializeHolidays,
    getLeaveDashboardStats
} from '../controllers/leaveController.js';

const router = express.Router();

// Dashboard stats
router.get('/stats', getLeaveDashboardStats);

// Leave types
router.get('/types', getLeaveTypes);
router.post('/types', createLeaveType);
router.put('/types/:id', updateLeaveType);
router.post('/types/initialize', initializeLeaveTypes);

// Leave balances
router.get('/balances', getAllLeaveBalances);
router.get('/balances/:employeeId', getLeaveBalance);
router.post('/balances/initialize', initializeAllBalances);

// Leave requests
router.get('/requests', getLeaveRequests);
router.post('/requests', applyLeave);
router.put('/requests/:id/process', processLeaveRequest);
router.put('/requests/:id/cancel', cancelLeaveRequest);

// Holidays
router.get('/holidays', getHolidays);
router.post('/holidays', createHoliday);
router.put('/holidays/:id', updateHoliday);
router.delete('/holidays/:id', deleteHoliday);
router.post('/holidays/initialize', initializeHolidays);

export default router;
