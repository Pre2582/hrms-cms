import { LeaveType, LeaveBalance, LeaveRequest, Holiday } from '../models/Leave.js';
import Employee from '../models/Employee.js';

// ==================== LEAVE TYPE MANAGEMENT ====================

// Get all leave types
export const getLeaveTypes = async (req, res) => {
    try {
        const leaveTypes = await LeaveType.find({ isActive: true }).sort({ name: 1 });
        res.status(200).json({ success: true, data: leaveTypes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching leave types', error: error.message });
    }
};

// Create leave type
export const createLeaveType = async (req, res) => {
    try {
        const leaveType = await LeaveType.create(req.body);
        res.status(201).json({ success: true, message: 'Leave type created successfully', data: leaveType });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Update leave type
export const updateLeaveType = async (req, res) => {
    try {
        const leaveType = await LeaveType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!leaveType) return res.status(404).json({ success: false, message: 'Leave type not found' });
        res.status(200).json({ success: true, message: 'Leave type updated', data: leaveType });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Initialize default leave types
export const initializeLeaveTypes = async (req, res) => {
    try {
        const defaults = [
            { name: 'Casual', code: 'CL', defaultDays: 12, isPaid: true, carryForward: false },
            { name: 'Sick', code: 'SL', defaultDays: 12, isPaid: true, carryForward: false },
            { name: 'Earned', code: 'EL', defaultDays: 15, isPaid: true, carryForward: true, maxCarryForward: 30 },
            { name: 'LOP', code: 'LOP', defaultDays: 0, isPaid: false, carryForward: false }
        ];

        for (const lt of defaults) {
            await LeaveType.findOneAndUpdate({ name: lt.name }, lt, { upsert: true, new: true });
        }

        res.status(200).json({ success: true, message: 'Leave types initialized' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== LEAVE BALANCE MANAGEMENT ====================

// Get leave balance for an employee
export const getLeaveBalance = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        let balance = await LeaveBalance.findOne({ employeeId, year });

        if (!balance) {
            // Initialize balance if not exists
            const leaveTypes = await LeaveType.find({ isActive: true });
            const balances = leaveTypes.map(lt => ({
                leaveType: lt.name,
                allocated: lt.defaultDays,
                used: 0,
                pending: 0,
                available: lt.defaultDays,
                carryForward: 0
            }));

            balance = await LeaveBalance.create({ employeeId, year, balances });
        }

        res.status(200).json({ success: true, data: balance });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching leave balance', error: error.message });
    }
};

// Get all employees leave balances
export const getAllLeaveBalances = async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const balances = await LeaveBalance.find({ year }).sort({ employeeId: 1 });

        // Enrich with employee names
        const enrichedBalances = await Promise.all(balances.map(async (bal) => {
            const employee = await Employee.findOne({ employeeId: bal.employeeId });
            return { ...bal.toObject(), employeeName: employee?.fullName || bal.employeeId };
        }));

        res.status(200).json({ success: true, data: enrichedBalances });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Initialize leave balance for all employees
export const initializeAllBalances = async (req, res) => {
    try {
        const year = parseInt(req.body.year) || new Date().getFullYear();
        const employees = await Employee.find({ status: 'Active' });
        const leaveTypes = await LeaveType.find({ isActive: true });

        for (const emp of employees) {
            const existing = await LeaveBalance.findOne({ employeeId: emp.employeeId, year });
            if (!existing) {
                const balances = leaveTypes.map(lt => ({
                    leaveType: lt.name,
                    allocated: lt.defaultDays,
                    used: 0,
                    pending: 0,
                    available: lt.defaultDays,
                    carryForward: 0
                }));
                await LeaveBalance.create({ employeeId: emp.employeeId, year, balances });
            }
        }

        res.status(200).json({ success: true, message: `Leave balances initialized for ${employees.length} employees` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== LEAVE REQUEST MANAGEMENT ====================

// Apply for leave
export const applyLeave = async (req, res) => {
    try {
        const { employeeId, leaveType, startDate, endDate, isHalfDay, halfDayType, reason } = req.body;

        // Validate employee
        const employee = await Employee.findOne({ employeeId });
        if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

        // Calculate number of days
        const start = new Date(startDate);
        const end = new Date(endDate);
        let numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        if (isHalfDay) numberOfDays = 0.5;

        // Check leave balance
        const year = start.getFullYear();
        const balance = await LeaveBalance.findOne({ employeeId, year });
        if (balance && leaveType !== 'LOP') {
            const typeBalance = balance.balances.find(b => b.leaveType === leaveType);
            if (!typeBalance || typeBalance.available < numberOfDays) {
                return res.status(400).json({ success: false, message: 'Insufficient leave balance' });
            }
        }

        // Check for overlapping requests
        const overlap = await LeaveRequest.findOne({
            employeeId,
            status: { $in: ['Pending', 'Approved'] },
            $or: [
                { startDate: { $lte: end }, endDate: { $gte: start } }
            ]
        });
        if (overlap) return res.status(400).json({ success: false, message: 'Leave request overlaps with existing request' });

        const leaveRequest = await LeaveRequest.create({
            employeeId, leaveType, startDate: start, endDate: end,
            numberOfDays, isHalfDay, halfDayType, reason
        });

        // Update pending balance
        if (balance && leaveType !== 'LOP') {
            const idx = balance.balances.findIndex(b => b.leaveType === leaveType);
            if (idx !== -1) {
                balance.balances[idx].pending += numberOfDays;
                balance.balances[idx].available -= numberOfDays;
                await balance.save();
            }
        }

        res.status(201).json({ success: true, message: 'Leave request submitted', data: leaveRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all leave requests
export const getLeaveRequests = async (req, res) => {
    try {
        const { employeeId, status, startDate, endDate } = req.query;
        let query = {};

        if (employeeId) query.employeeId = employeeId;
        if (status) query.status = status;
        if (startDate && endDate) {
            query.startDate = { $gte: new Date(startDate) };
            query.endDate = { $lte: new Date(endDate) };
        }

        const requests = await LeaveRequest.find(query).sort({ appliedOn: -1 });

        const enrichedRequests = await Promise.all(requests.map(async (req) => {
            const employee = await Employee.findOne({ employeeId: req.employeeId });
            return { ...req.toObject(), employeeName: employee?.fullName || req.employeeId };
        }));

        res.status(200).json({ success: true, count: enrichedRequests.length, data: enrichedRequests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Approve/Reject leave request
export const processLeaveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, rejectionReason, approvedBy } = req.body;

        const leaveRequest = await LeaveRequest.findById(id);
        if (!leaveRequest) return res.status(404).json({ success: false, message: 'Leave request not found' });
        if (leaveRequest.status !== 'Pending') return res.status(400).json({ success: false, message: 'Request already processed' });

        const year = leaveRequest.startDate.getFullYear();
        const balance = await LeaveBalance.findOne({ employeeId: leaveRequest.employeeId, year });

        if (action === 'approve') {
            leaveRequest.status = 'Approved';
            leaveRequest.approvedBy = approvedBy || 'HR Admin';
            leaveRequest.approvedOn = new Date();

            // Update balance: move from pending to used
            if (balance && leaveRequest.leaveType !== 'LOP') {
                const idx = balance.balances.findIndex(b => b.leaveType === leaveRequest.leaveType);
                if (idx !== -1) {
                    balance.balances[idx].pending -= leaveRequest.numberOfDays;
                    balance.balances[idx].used += leaveRequest.numberOfDays;
                    await balance.save();
                }
            }
        } else {
            leaveRequest.status = 'Rejected';
            leaveRequest.rejectionReason = rejectionReason || '';
            leaveRequest.approvedBy = approvedBy || 'HR Admin';
            leaveRequest.approvedOn = new Date();

            // Restore balance
            if (balance && leaveRequest.leaveType !== 'LOP') {
                const idx = balance.balances.findIndex(b => b.leaveType === leaveRequest.leaveType);
                if (idx !== -1) {
                    balance.balances[idx].pending -= leaveRequest.numberOfDays;
                    balance.balances[idx].available += leaveRequest.numberOfDays;
                    await balance.save();
                }
            }
        }

        await leaveRequest.save();
        res.status(200).json({ success: true, message: `Leave request ${action}d`, data: leaveRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Cancel leave request
export const cancelLeaveRequest = async (req, res) => {
    try {
        const leaveRequest = await LeaveRequest.findById(req.params.id);
        if (!leaveRequest) return res.status(404).json({ success: false, message: 'Leave request not found' });

        if (leaveRequest.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Request already cancelled' });
        }

        const year = leaveRequest.startDate.getFullYear();
        const balance = await LeaveBalance.findOne({ employeeId: leaveRequest.employeeId, year });

        // Restore balance based on previous status
        if (balance && leaveRequest.leaveType !== 'LOP') {
            const idx = balance.balances.findIndex(b => b.leaveType === leaveRequest.leaveType);
            if (idx !== -1) {
                if (leaveRequest.status === 'Pending') {
                    balance.balances[idx].pending -= leaveRequest.numberOfDays;
                } else if (leaveRequest.status === 'Approved') {
                    balance.balances[idx].used -= leaveRequest.numberOfDays;
                }
                balance.balances[idx].available += leaveRequest.numberOfDays;
                await balance.save();
            }
        }

        leaveRequest.status = 'Cancelled';
        await leaveRequest.save();

        res.status(200).json({ success: true, message: 'Leave request cancelled', data: leaveRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== HOLIDAY MANAGEMENT ====================

// Get all holidays
export const getHolidays = async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const holidays = await Holiday.find({ year, isActive: true }).sort({ date: 1 });
        res.status(200).json({ success: true, data: holidays });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create holiday
export const createHoliday = async (req, res) => {
    try {
        const { name, date, type, description, isOptional } = req.body;
        const holidayDate = new Date(date);
        const year = holidayDate.getFullYear();

        const holiday = await Holiday.create({ name, date: holidayDate, type, description, isOptional, year });
        res.status(201).json({ success: true, message: 'Holiday created', data: holiday });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Update holiday
export const updateHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found' });
        res.status(200).json({ success: true, message: 'Holiday updated', data: holiday });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Delete holiday
export const deleteHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.findByIdAndDelete(req.params.id);
        if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found' });
        res.status(200).json({ success: true, message: 'Holiday deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Initialize default holidays
export const initializeHolidays = async (req, res) => {
    try {
        const year = parseInt(req.body.year) || new Date().getFullYear();
        const defaults = [
            { name: 'Republic Day', date: `${year}-01-26`, type: 'National' },
            { name: 'Holi', date: `${year}-03-14`, type: 'National' },
            { name: 'Good Friday', date: `${year}-03-29`, type: 'National' },
            { name: 'Independence Day', date: `${year}-08-15`, type: 'National' },
            { name: 'Gandhi Jayanti', date: `${year}-10-02`, type: 'National' },
            { name: 'Diwali', date: `${year}-11-01`, type: 'National' },
            { name: 'Christmas', date: `${year}-12-25`, type: 'National' }
        ];

        for (const h of defaults) {
            await Holiday.findOneAndUpdate(
                { name: h.name, year },
                { ...h, date: new Date(h.date), year },
                { upsert: true }
            );
        }

        res.status(200).json({ success: true, message: 'Holidays initialized' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get leave dashboard stats
export const getLeaveDashboardStats = async (req, res) => {
    try {
        const year = new Date().getFullYear();
        const pendingRequests = await LeaveRequest.countDocuments({ status: 'Pending' });
        const approvedThisMonth = await LeaveRequest.countDocuments({
            status: 'Approved',
            approvedOn: { $gte: new Date(year, new Date().getMonth(), 1) }
        });
        const upcomingHolidays = await Holiday.find({
            year,
            date: { $gte: new Date() }
        }).limit(5).sort({ date: 1 });

        res.status(200).json({
            success: true,
            data: { pendingRequests, approvedThisMonth, upcomingHolidays }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
