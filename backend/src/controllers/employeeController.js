import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';

// Get all employees
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching employees',
      error: error.message
    });
  }
};

// Get single employee
export const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching employee',
      error: error.message
    });
  }
};

// Create new employee
export const createEmployee = async (req, res) => {
  try {
    const { employeeId, fullName, email, department } = req.body;

    // Check if employee with same employeeId or email already exists
    const existingEmployee = await Employee.findOne({
      $or: [{ employeeId }, { email }]
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: existingEmployee.employeeId === employeeId
          ? 'Employee ID already exists'
          : 'Email already exists'
      });
    }

    const employee = await Employee.create({
      employeeId,
      fullName,
      email,
      department
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
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
      message: 'Error creating employee',
      error: error.message
    });
  }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Delete all attendance records for this employee
    await Attendance.deleteMany({ employeeId: employee.employeeId });

    await Employee.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Employee and associated attendance records deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting employee',
      error: error.message
    });
  }
};
