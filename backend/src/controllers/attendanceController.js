import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';

// Configuration for working hours (can be moved to environment variables or settings)
const WORK_CONFIG = {
  standardStartTime: '09:00', // 9 AM
  standardEndTime: '18:00',   // 6 PM
  lateThresholdMinutes: 15,   // Late if punch in after 9:15 AM
  earlyLeaveThresholdMinutes: 30, // Early if punch out before 5:30 PM
  halfDayThresholdHours: 4,   // Half-day if worked less than 4 hours
  fullDayHours: 8             // Standard full day hours
};

// Helper function to determine attendance status based on punch times
const calculateAttendanceStatus = (punchIn, punchOut) => {
  if (!punchIn) return 'Absent';

  const punchInDate = new Date(punchIn);
  const punchInHour = punchInDate.getHours();
  const punchInMinute = punchInDate.getMinutes();

  const [standardHour, standardMinute] = WORK_CONFIG.standardStartTime.split(':').map(Number);
  const lateTime = standardHour * 60 + standardMinute + WORK_CONFIG.lateThresholdMinutes;
  const actualPunchInTime = punchInHour * 60 + punchInMinute;

  if (!punchOut) {
    // Still working - just check if late
    if (actualPunchInTime > lateTime) return 'Late';
    return 'Present';
  }

  const punchOutDate = new Date(punchOut);
  const diffMs = punchOutDate - punchInDate;
  const workedHours = diffMs / (1000 * 60 * 60);

  // Check for half-day
  if (workedHours < WORK_CONFIG.halfDayThresholdHours) {
    return 'Half-Day';
  }

  // Check for early leave
  const punchOutHour = punchOutDate.getHours();
  const punchOutMinute = punchOutDate.getMinutes();
  const [endHour, endMinute] = WORK_CONFIG.standardEndTime.split(':').map(Number);
  const earlyLeaveTime = endHour * 60 + endMinute - WORK_CONFIG.earlyLeaveThresholdMinutes;
  const actualPunchOutTime = punchOutHour * 60 + punchOutMinute;

  if (actualPunchOutTime < earlyLeaveTime) {
    return 'Early';
  }

  // Check for late arrival
  if (actualPunchInTime > lateTime) {
    return 'Late';
  }

  return 'Present';
};

// Get all attendance records
export const getAllAttendance = async (req, res) => {
  try {
    const { employeeId, date, startDate, endDate, approvalStatus } = req.query;
    let query = {};

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (date) {
      const filterDate = new Date(date);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setHours(23, 59, 59, 999);
      query.date = { $gte: filterDate, $lte: nextDay };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    if (approvalStatus) {
      query.approvalStatus = approvalStatus;
    }

    const attendance = await Attendance.find(query).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records',
      error: error.message
    });
  }
};

// Get calendar data for a specific month
export const getCalendarData = async (req, res) => {
  try {
    const { employeeId, year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month are required'
      });
    }

    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    let query = {
      date: { $gte: startDate, $lte: endDate }
    };

    if (employeeId) {
      query.employeeId = employeeId;
    }

    const attendance = await Attendance.find(query).sort({ date: 1 });

    // Group by date for calendar view
    const calendarData = {};
    attendance.forEach(record => {
      const dateKey = new Date(record.date).toISOString().split('T')[0];
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = [];
      }
      calendarData[dateKey].push(record);
    });

    // Calculate summary
    const summary = {
      totalPresent: attendance.filter(r => r.status === 'Present').length,
      totalAbsent: attendance.filter(r => r.status === 'Absent').length,
      totalLate: attendance.filter(r => r.status === 'Late').length,
      totalEarly: attendance.filter(r => r.status === 'Early').length,
      totalHalfDay: attendance.filter(r => r.status === 'Half-Day').length,
      pendingApprovals: attendance.filter(r => r.approvalStatus === 'Pending').length
    };

    res.status(200).json({
      success: true,
      data: {
        calendar: calendarData,
        summary,
        attendance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar data',
      error: error.message
    });
  }
};

// Get attendance for specific employee
export const getEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const attendance = await Attendance.find({ employeeId }).sort({ date: -1 });

    // Calculate statistics
    const stats = {
      totalPresent: attendance.filter(r => r.status === 'Present').length,
      totalAbsent: attendance.filter(r => r.status === 'Absent').length,
      totalLate: attendance.filter(r => r.status === 'Late').length,
      totalEarly: attendance.filter(r => r.status === 'Early').length,
      totalHalfDay: attendance.filter(r => r.status === 'Half-Day').length,
      totalWorkingHours: attendance.reduce((sum, r) => sum + (r.workingHours || 0), 0)
    };

    res.status(200).json({
      success: true,
      count: attendance.length,
      stats,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records',
      error: error.message
    });
  }
};

// Punch In
export const punchIn = async (req, res) => {
  try {
    const { employeeId } = req.body;

    // Validate employee exists
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already punched in today
    const existingAttendance = await Attendance.findOne({
      employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingAttendance && existingAttendance.punchIn) {
      return res.status(400).json({
        success: false,
        message: 'Already punched in today',
        data: existingAttendance
      });
    }

    const punchInTime = new Date();
    const status = calculateAttendanceStatus(punchInTime, null);

    let attendance;
    if (existingAttendance) {
      // Update existing record
      existingAttendance.punchIn = punchInTime;
      existingAttendance.status = status;
      await existingAttendance.save();
      attendance = existingAttendance;
    } else {
      // Create new attendance record
      attendance = await Attendance.create({
        employeeId,
        date: today,
        punchIn: punchInTime,
        status
      });
    }

    res.status(201).json({
      success: true,
      message: `Punched in successfully at ${punchInTime.toLocaleTimeString()}`,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error punching in',
      error: error.message
    });
  }
};

// Punch Out
export const punchOut = async (req, res) => {
  try {
    const { employeeId } = req.body;

    // Validate employee exists
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!attendance || !attendance.punchIn) {
      return res.status(400).json({
        success: false,
        message: 'No punch in record found for today. Please punch in first.'
      });
    }

    if (attendance.punchOut) {
      return res.status(400).json({
        success: false,
        message: 'Already punched out today',
        data: attendance
      });
    }

    const punchOutTime = new Date();
    attendance.punchOut = punchOutTime;
    attendance.status = calculateAttendanceStatus(attendance.punchIn, punchOutTime);
    attendance.calculateWorkingHours();
    await attendance.save();

    res.status(200).json({
      success: true,
      message: `Punched out successfully at ${punchOutTime.toLocaleTimeString()}. Worked ${attendance.workingHours.toFixed(2)} hours.`,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error punching out',
      error: error.message
    });
  }
};

// Get today's punch status for an employee
export const getTodayPunchStatus = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    res.status(200).json({
      success: true,
      data: {
        hasPunchedIn: !!(attendance && attendance.punchIn),
        hasPunchedOut: !!(attendance && attendance.punchOut),
        punchIn: attendance?.punchIn || null,
        punchOut: attendance?.punchOut || null,
        status: attendance?.status || null,
        workingHours: attendance?.workingHours || 0,
        attendance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching punch status',
      error: error.message
    });
  }
};

// Request manual correction
export const requestCorrection = async (req, res) => {
  try {
    const { employeeId, date, correctedPunchIn, correctedPunchOut, correctedStatus, reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Correction reason is required'
      });
    }

    // Validate employee exists
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const correctionDate = new Date(date);
    correctionDate.setHours(0, 0, 0, 0);

    // Find existing attendance record
    let attendance = await Attendance.findOne({
      employeeId,
      date: {
        $gte: correctionDate,
        $lt: new Date(correctionDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!attendance) {
      // Create new record for correction request
      attendance = new Attendance({
        employeeId,
        date: correctionDate,
        status: 'Absent'
      });
    }

    // Check if there's already a pending correction
    if (attendance.approvalStatus === 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'A correction request is already pending for this date'
      });
    }

    // Store original values before correction
    attendance.originalStatus = attendance.status;
    attendance.originalPunchIn = attendance.punchIn;
    attendance.originalPunchOut = attendance.punchOut;

    // Apply corrections
    if (correctedPunchIn) {
      attendance.punchIn = new Date(correctedPunchIn);
    }
    if (correctedPunchOut) {
      attendance.punchOut = new Date(correctedPunchOut);
    }
    if (correctedStatus) {
      attendance.status = correctedStatus;
    } else if (correctedPunchIn || correctedPunchOut) {
      // Recalculate status based on corrected times
      attendance.status = calculateAttendanceStatus(
        correctedPunchIn ? new Date(correctedPunchIn) : attendance.punchIn,
        correctedPunchOut ? new Date(correctedPunchOut) : attendance.punchOut
      );
    }

    // Calculate working hours if both punch times are available
    if (attendance.punchIn && attendance.punchOut) {
      attendance.calculateWorkingHours();
    }

    // Set correction metadata
    attendance.isManualCorrection = true;
    attendance.correctionReason = reason;
    attendance.correctionRequestedBy = employeeId;
    attendance.approvalStatus = 'Pending';

    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Correction request submitted successfully. Awaiting HR approval.',
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting correction request',
      error: error.message
    });
  }
};

// Get all pending correction requests (HR view)
export const getPendingCorrections = async (req, res) => {
  try {
    const pendingCorrections = await Attendance.find({
      approvalStatus: 'Pending',
      isManualCorrection: true
    }).sort({ createdAt: -1 });

    // Get employee details for each correction
    const enrichedCorrections = await Promise.all(
      pendingCorrections.map(async (correction) => {
        const employee = await Employee.findOne({ employeeId: correction.employeeId });
        return {
          ...correction.toObject(),
          employeeName: employee?.fullName || correction.employeeId,
          employeeEmail: employee?.email || ''
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedCorrections.length,
      data: enrichedCorrections
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching pending corrections',
      error: error.message
    });
  }
};

// Approve or reject correction request (HR action)
export const processCorrectionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remarks, approvedBy } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"'
      });
    }

    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    if (attendance.approvalStatus !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'This correction request has already been processed'
      });
    }

    if (action === 'approve') {
      attendance.approvalStatus = 'Approved';
      attendance.approvedBy = approvedBy || 'HR Admin';
      attendance.approvalDate = new Date();
      attendance.approvalRemarks = remarks || '';
    } else {
      // Reject - restore original values
      attendance.approvalStatus = 'Rejected';
      attendance.approvedBy = approvedBy || 'HR Admin';
      attendance.approvalDate = new Date();
      attendance.approvalRemarks = remarks || '';

      // Restore original values
      if (attendance.originalStatus) {
        attendance.status = attendance.originalStatus;
      }
      if (attendance.originalPunchIn) {
        attendance.punchIn = attendance.originalPunchIn;
      }
      if (attendance.originalPunchOut) {
        attendance.punchOut = attendance.originalPunchOut;
      }

      // Recalculate working hours
      if (attendance.punchIn && attendance.punchOut) {
        attendance.calculateWorkingHours();
      }
    }

    await attendance.save();

    res.status(200).json({
      success: true,
      message: `Correction request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing correction request',
      error: error.message
    });
  }
};

// Mark attendance
export const markAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, punchIn, punchOut, remarks } = req.body;

    // Validate employee exists
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if attendance already marked for this date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const existingAttendance = await Attendance.findOne({
      employeeId,
      date: {
        $gte: attendanceDate,
        $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.status = status;
      if (punchIn && punchIn.trim() !== '') {
        const punchInDate = new Date(punchIn);
        if (!isNaN(punchInDate.getTime())) existingAttendance.punchIn = punchInDate;
      }
      if (punchOut && punchOut.trim() !== '') {
        const punchOutDate = new Date(punchOut);
        if (!isNaN(punchOutDate.getTime())) existingAttendance.punchOut = punchOutDate;
      }
      if (remarks !== undefined) existingAttendance.remarks = remarks;

      if (existingAttendance.punchIn && existingAttendance.punchOut) {
        existingAttendance.calculateWorkingHours();
      }

      await existingAttendance.save();

      return res.status(200).json({
        success: true,
        message: 'Attendance updated successfully',
        data: existingAttendance
      });
    }

    // Create new attendance record
    const attendanceData = {
      employeeId,
      date: attendanceDate,
      status
    };

    if (punchIn && punchIn.trim() !== '') {
      const punchInDate = new Date(punchIn);
      if (!isNaN(punchInDate.getTime())) attendanceData.punchIn = punchInDate;
    }
    if (punchOut && punchOut.trim() !== '') {
      const punchOutDate = new Date(punchOut);
      if (!isNaN(punchOutDate.getTime())) attendanceData.punchOut = punchOutDate;
    }
    if (remarks) attendanceData.remarks = remarks;

    const attendance = await Attendance.create(attendanceData);

    if (attendance.punchIn && attendance.punchOut) {
      attendance.calculateWorkingHours();
      await attendance.save();
    }

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: attendance
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error marking attendance',
      error: error.message
    });
  }
};

// Update attendance record
export const updateAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, punchIn, punchOut, remarks } = req.body;

    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Validate employee exists if employeeId is being updated
    if (employeeId && employeeId !== attendance.employeeId) {
      const employee = await Employee.findOne({ employeeId });
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
    }

    // Check for duplicate attendance if date or employeeId is being changed
    if (date || employeeId) {
      const checkDate = date ? new Date(date) : attendance.date;
      checkDate.setHours(0, 0, 0, 0);
      const checkEmployeeId = employeeId || attendance.employeeId;

      const existingAttendance = await Attendance.findOne({
        _id: { $ne: req.params.id },
        employeeId: checkEmployeeId,
        date: {
          $gte: checkDate,
          $lt: new Date(checkDate.getTime() + 24 * 60 * 60 * 1000)
        }
      });

      if (existingAttendance) {
        return res.status(400).json({
          success: false,
          message: 'Attendance already marked for this employee on this date'
        });
      }
    }

    // Update attendance record
    const updateData = {
      employeeId: employeeId || attendance.employeeId,
      date: date ? new Date(date) : attendance.date,
      status: status || attendance.status
    };

    if (punchIn !== undefined) {
      if (punchIn && typeof punchIn === 'string' && punchIn.trim() !== '') {
        const punchInDate = new Date(punchIn);
        updateData.punchIn = !isNaN(punchInDate.getTime()) ? punchInDate : null;
      } else {
        updateData.punchIn = null;
      }
    }
    if (punchOut !== undefined) {
      if (punchOut && typeof punchOut === 'string' && punchOut.trim() !== '') {
        const punchOutDate = new Date(punchOut);
        updateData.punchOut = !isNaN(punchOutDate.getTime()) ? punchOutDate : null;
      } else {
        updateData.punchOut = null;
      }
    }
    if (remarks !== undefined) updateData.remarks = remarks;

    const updatedAttendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Recalculate working hours
    if (updatedAttendance.punchIn && updatedAttendance.punchOut) {
      updatedAttendance.calculateWorkingHours();
      await updatedAttendance.save();
    }

    res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully',
      data: updatedAttendance
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating attendance record',
      error: error.message
    });
  }
};

// Delete attendance record
export const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    await Attendance.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting attendance record',
      error: error.message
    });
  }
};

// Get attendance statistics for dashboard
export const getAttendanceStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Get today's statistics
    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    });

    const totalEmployees = await Employee.countDocuments();

    const stats = {
      totalEmployees,
      presentToday: todayAttendance.filter(r => r.status === 'Present').length,
      absentToday: todayAttendance.filter(r => r.status === 'Absent').length,
      lateToday: todayAttendance.filter(r => r.status === 'Late').length,
      earlyToday: todayAttendance.filter(r => r.status === 'Early').length,
      halfDayToday: todayAttendance.filter(r => r.status === 'Half-Day').length,
      pendingApprovals: await Attendance.countDocuments({ approvalStatus: 'Pending' }),
      notMarked: totalEmployees - todayAttendance.length
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance statistics',
      error: error.message
    });
  }
};
