import express from 'express';
import {
    getSalaryStructure, getAllSalaryStructures, upsertSalaryStructure,
    getPayroll, processPayroll, lockPayroll, approvePayroll, getPayslip,
    getBonuses, createBonus, approveBonus,
    getPayrollConfig, updatePayrollConfig, getPayrollStats
} from '../controllers/payrollController.js';

const router = express.Router();

// Stats
router.get('/stats', getPayrollStats);

// Salary structures
router.get('/salary-structures', getAllSalaryStructures);
router.get('/salary-structures/:employeeId', getSalaryStructure);
router.post('/salary-structures', upsertSalaryStructure);

// Payroll
router.get('/', getPayroll);
router.post('/process', processPayroll);
router.post('/lock', lockPayroll);
router.put('/:id/approve', approvePayroll);

// Payslip
router.get('/payslip/:employeeId/:month/:year', getPayslip);

// Bonuses
router.get('/bonuses', getBonuses);
router.post('/bonuses', createBonus);
router.put('/bonuses/:id/approve', approveBonus);

// Config
router.get('/config', getPayrollConfig);
router.put('/config', updatePayrollConfig);

export default router;
