import { SalaryStructure, Payroll, Bonus, PayrollConfig } from '../models/Payroll.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import { LeaveRequest, Holiday } from '../models/Leave.js';

// ==================== SALARY STRUCTURE MANAGEMENT ====================

// Get salary structure for an employee
export const getSalaryStructure = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const structure = await SalaryStructure.findOne({ employeeId, isActive: true });
        if (!structure) return res.status(404).json({ success: false, message: 'Salary structure not found' });
        res.status(200).json({ success: true, data: structure });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all salary structures
export const getAllSalaryStructures = async (req, res) => {
    try {
        const structures = await SalaryStructure.find({ isActive: true }).sort({ employeeId: 1 });
        const enriched = await Promise.all(structures.map(async (s) => {
            const emp = await Employee.findOne({ employeeId: s.employeeId });
            return { ...s.toObject(), employeeName: emp?.fullName || s.employeeId, department: emp?.department || '' };
        }));
        res.status(200).json({ success: true, data: enriched });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create/Update salary structure
export const upsertSalaryStructure = async (req, res) => {
    try {
        const { employeeId, basic, hra, allowances, deductions, effectiveFrom } = req.body;

        const employee = await Employee.findOne({ employeeId });
        if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

        let structure = await SalaryStructure.findOne({ employeeId });

        if (structure) {
            structure.basic = basic;
            structure.hra = hra || 0;
            structure.allowances = allowances || {};
            structure.deductions = deductions || {};
            structure.effectiveFrom = effectiveFrom || new Date();
            await structure.save();
        } else {
            structure = await SalaryStructure.create({
                employeeId, basic, hra: hra || 0,
                allowances: allowances || {}, deductions: deductions || {},
                effectiveFrom: effectiveFrom || new Date()
            });
        }

        res.status(200).json({ success: true, message: 'Salary structure saved', data: structure });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ==================== PAYROLL PROCESSING ====================

// Get payroll for month/year
export const getPayroll = async (req, res) => {
    try {
        const { month, year, employeeId, status } = req.query;
        let query = {};

        if (month) query.month = parseInt(month);
        if (year) query.year = parseInt(year);
        if (employeeId) query.employeeId = employeeId;
        if (status) query.status = status;

        const payrolls = await Payroll.find(query).sort({ employeeId: 1 });

        const enriched = await Promise.all(payrolls.map(async (p) => {
            const emp = await Employee.findOne({ employeeId: p.employeeId });
            return { ...p.toObject(), employeeName: emp?.fullName || p.employeeId, department: emp?.department || '' };
        }));

        res.status(200).json({ success: true, count: enriched.length, data: enriched });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Process payroll for a month
export const processPayroll = async (req, res) => {
    try {
        const { month, year, processedBy } = req.body;

        if (!month || !year) {
            return res.status(400).json({ success: false, message: 'Month and year are required' });
        }

        // Get all active employees with salary structures
        const employees = await Employee.find({ status: 'Active' });
        const processed = [];
        const errors = [];

        for (const emp of employees) {
            try {
                // Check if already processed
                const existing = await Payroll.findOne({ employeeId: emp.employeeId, month, year });
                if (existing && existing.isLocked) {
                    errors.push({ employeeId: emp.employeeId, error: 'Payroll is locked' });
                    continue;
                }

                // Get salary structure
                const structure = await SalaryStructure.findOne({ employeeId: emp.employeeId, isActive: true });
                if (!structure) {
                    errors.push({ employeeId: emp.employeeId, error: 'No salary structure found' });
                    continue;
                }

                // Calculate attendance
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0);
                const totalDays = endDate.getDate();

                const attendanceRecords = await Attendance.find({
                    employeeId: emp.employeeId,
                    date: { $gte: startDate, $lte: endDate }
                });

                const presentDays = attendanceRecords.filter(a => ['Present', 'Late'].includes(a.status)).length;
                const halfDays = attendanceRecords.filter(a => a.status === 'Half-Day').length;
                const absentDays = attendanceRecords.filter(a => a.status === 'Absent').length;

                // Get approved leaves
                const leaves = await LeaveRequest.find({
                    employeeId: emp.employeeId,
                    status: 'Approved',
                    startDate: { $lte: endDate },
                    endDate: { $gte: startDate }
                });

                let paidLeaveDays = 0;
                let lopDays = 0;
                for (const leave of leaves) {
                    if (leave.leaveType === 'LOP') {
                        lopDays += leave.numberOfDays;
                    } else {
                        paidLeaveDays += leave.numberOfDays;
                    }
                }

                // Get holidays
                const holidays = await Holiday.find({
                    year,
                    date: { $gte: startDate, $lte: endDate },
                    isActive: true
                });

                // Calculate weekoffs (Sundays)
                let weekoffs = 0;
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    if (d.getDay() === 0) weekoffs++;
                }

                const workingDays = totalDays - weekoffs - holidays.length;
                const effectivePresentDays = presentDays + (halfDays * 0.5) + paidLeaveDays;

                // Calculate per day salary
                const perDaySalary = structure.grossSalary / workingDays;
                const lopDeduction = lopDays * perDaySalary;

                // Get approved bonuses for this month
                const bonuses = await Bonus.find({
                    employeeId: emp.employeeId,
                    month, year,
                    status: 'Approved',
                    includedInPayroll: false
                });
                const bonusAmount = bonuses.reduce((sum, b) => sum + b.amount, 0);

                // Create/Update payroll
                const payrollData = {
                    employeeId: emp.employeeId,
                    month, year,
                    earnings: {
                        basic: structure.basic,
                        hra: structure.hra,
                        conveyance: structure.allowances.conveyance || 0,
                        medical: structure.allowances.medical || 0,
                        special: structure.allowances.special || 0,
                        lta: structure.allowances.lta || 0,
                        food: structure.allowances.food || 0,
                        otherAllowances: structure.allowances.other || 0,
                        bonus: bonusAmount,
                        incentive: 0,
                        overtime: 0,
                        arrears: 0
                    },
                    deductions: {
                        pf: structure.deductions.pf || 0,
                        esi: structure.deductions.esi || 0,
                        professionalTax: structure.deductions.professionalTax || 0,
                        tds: structure.deductions.tds || 0,
                        loanRecovery: structure.deductions.loanRecovery || 0,
                        lopDeduction: Math.round(lopDeduction),
                        otherDeductions: structure.deductions.other || 0
                    },
                    attendance: {
                        workingDays,
                        presentDays: effectivePresentDays,
                        absentDays,
                        lopDays,
                        paidLeaveDays,
                        holidays: holidays.length,
                        weekoffs
                    },
                    status: 'Processed',
                    processedBy: processedBy || 'System',
                    processedOn: new Date()
                };

                let payroll;
                if (existing) {
                    payroll = await Payroll.findByIdAndUpdate(existing._id, payrollData, { new: true });
                } else {
                    payroll = await Payroll.create(payrollData);
                }

                // Mark bonuses as included
                for (const bonus of bonuses) {
                    bonus.includedInPayroll = true;
                    await bonus.save();
                }

                processed.push({ employeeId: emp.employeeId, name: emp.fullName, netPayable: payroll.netPayable });
            } catch (err) {
                errors.push({ employeeId: emp.employeeId, error: err.message });
            }
        }

        res.status(200).json({
            success: true,
            message: `Payroll processed for ${processed.length} employees`,
            data: { processed, errors }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lock payroll
export const lockPayroll = async (req, res) => {
    try {
        const { month, year } = req.body;

        await Payroll.updateMany(
            { month, year, status: { $in: ['Processed', 'Approved'] } },
            { isLocked: true, status: 'Locked' }
        );

        res.status(200).json({ success: true, message: 'Payroll locked successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Approve payroll
export const approvePayroll = async (req, res) => {
    try {
        const { id } = req.params;
        const { approvedBy } = req.body;

        const payroll = await Payroll.findById(id);
        if (!payroll) return res.status(404).json({ success: false, message: 'Payroll not found' });
        if (payroll.isLocked) return res.status(400).json({ success: false, message: 'Payroll is locked' });

        payroll.status = 'Approved';
        payroll.approvedBy = approvedBy || 'HR Admin';
        payroll.approvedOn = new Date();
        await payroll.save();

        res.status(200).json({ success: true, message: 'Payroll approved', data: payroll });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get payslip
export const getPayslip = async (req, res) => {
    try {
        const { employeeId, month, year } = req.params;

        const payroll = await Payroll.findOne({ employeeId, month: parseInt(month), year: parseInt(year) });
        if (!payroll) return res.status(404).json({ success: false, message: 'Payslip not found' });

        const employee = await Employee.findOne({ employeeId });
        const structure = await SalaryStructure.findOne({ employeeId });

        const payslip = {
            ...payroll.toObject(),
            employee: {
                employeeId: employee?.employeeId,
                name: employee?.fullName,
                email: employee?.email,
                department: employee?.department,
                designation: employee?.designation
            },
            company: {
                name: 'HRMS Lite Company',
                address: 'Company Address Here'
            }
        };

        res.status(200).json({ success: true, data: payslip });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== BONUS MANAGEMENT ====================

// Get bonuses
export const getBonuses = async (req, res) => {
    try {
        const { employeeId, month, year, status } = req.query;
        let query = {};

        if (employeeId) query.employeeId = employeeId;
        if (month) query.month = parseInt(month);
        if (year) query.year = parseInt(year);
        if (status) query.status = status;

        const bonuses = await Bonus.find(query).sort({ createdAt: -1 });

        const enriched = await Promise.all(bonuses.map(async (b) => {
            const emp = await Employee.findOne({ employeeId: b.employeeId });
            return { ...b.toObject(), employeeName: emp?.fullName || b.employeeId };
        }));

        res.status(200).json({ success: true, data: enriched });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create bonus
export const createBonus = async (req, res) => {
    try {
        const bonus = await Bonus.create(req.body);
        res.status(201).json({ success: true, message: 'Bonus created', data: bonus });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Approve bonus
export const approveBonus = async (req, res) => {
    try {
        const bonus = await Bonus.findById(req.params.id);
        if (!bonus) return res.status(404).json({ success: false, message: 'Bonus not found' });

        bonus.status = 'Approved';
        bonus.approvedBy = req.body.approvedBy || 'HR Admin';
        bonus.approvedOn = new Date();
        await bonus.save();

        res.status(200).json({ success: true, message: 'Bonus approved', data: bonus });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== PAYROLL CONFIG ====================

// Get config
export const getPayrollConfig = async (req, res) => {
    try {
        let config = await PayrollConfig.findOne({ isActive: true });
        if (!config) {
            config = await PayrollConfig.create({
                pfPercentage: 12,
                esiPercentage: 0.75,
                esiThreshold: 21000,
                professionalTaxSlab: [
                    { minSalary: 0, maxSalary: 15000, tax: 0 },
                    { minSalary: 15001, maxSalary: 20000, tax: 150 },
                    { minSalary: 20001, maxSalary: 999999999, tax: 200 }
                ]
            });
        }
        res.status(200).json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update config
export const updatePayrollConfig = async (req, res) => {
    try {
        const config = await PayrollConfig.findOneAndUpdate({ isActive: true }, req.body, { new: true, upsert: true });
        res.status(200).json({ success: true, message: 'Config updated', data: config });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get payroll dashboard stats
export const getPayrollStats = async (req, res) => {
    try {
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const payrolls = await Payroll.find({ month, year });

        const totalGross = payrolls.reduce((sum, p) => sum + p.grossEarnings, 0);
        const totalDeductions = payrolls.reduce((sum, p) => sum + p.totalDeductions, 0);
        const totalNet = payrolls.reduce((sum, p) => sum + p.netPayable, 0);
        const processed = payrolls.filter(p => p.status !== 'Draft').length;
        const pending = payrolls.filter(p => p.status === 'Processed').length;
        const approved = payrolls.filter(p => p.status === 'Approved').length;
        const locked = payrolls.filter(p => p.isLocked).length;

        res.status(200).json({
            success: true,
            data: {
                month, year,
                totalEmployees: payrolls.length,
                totalGross, totalDeductions, totalNet,
                processed, pending, approved, locked
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
