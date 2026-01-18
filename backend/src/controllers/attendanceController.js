import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';

// Get all attendance records
export const getAllAttendance = async (req, res) => {
  try {
    const { employeeId, date } = req.query;
    let query = {};

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
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

    // Calculate total present days
    const totalPresent = attendance.filter(record => record.status === 'Present').length;

    res.status(200).json({
      success: true,
      count: attendance.length,
      totalPresent,
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

// Mark attendance
export const markAttendance = async (req, res) => {
  try {
    const { employeeId, date, status } = req.body;

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
      await existingAttendance.save();

      return res.status(200).json({
        success: true,
        message: 'Attendance updated successfully',
        data: existingAttendance
      });
    }

    // Create new attendance record
    const attendance = await Attendance.create({
      employeeId,
      date: attendanceDate,
      status
    });

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
