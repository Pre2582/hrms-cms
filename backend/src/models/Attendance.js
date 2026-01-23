import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    ref: 'Employee'
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['Present', 'Absent', 'Late', 'Early', 'Half-Day'],
      message: 'Status must be Present, Absent, Late, Early, or Half-Day'
    }
  },
  // Punch in/out records
  punchIn: {
    type: Date,
    default: null
  },
  punchOut: {
    type: Date,
    default: null
  },
  // Working hours configuration
  workingHours: {
    type: Number,
    default: 0 // Calculated working hours in decimal
  },
  // Manual correction fields
  isManualCorrection: {
    type: Boolean,
    default: false
  },
  correctionReason: {
    type: String,
    default: ''
  },
  correctionRequestedBy: {
    type: String,
    default: ''
  },
  originalStatus: {
    type: String,
    default: ''
  },
  originalPunchIn: {
    type: Date,
    default: null
  },
  originalPunchOut: {
    type: Date,
    default: null
  },
  // Approval workflow
  approvalStatus: {
    type: String,
    enum: {
      values: ['Pending', 'Approved', 'Rejected', 'None'],
      message: 'Approval status must be Pending, Approved, Rejected, or None'
    },
    default: 'None'
  },
  approvedBy: {
    type: String,
    default: ''
  },
  approvalDate: {
    type: Date,
    default: null
  },
  approvalRemarks: {
    type: String,
    default: ''
  },
  // General remarks
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Create compound index to prevent duplicate attendance for same employee on same date
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Virtual field to check if attendance is pending approval
attendanceSchema.virtual('isPendingApproval').get(function() {
  return this.isManualCorrection && this.approvalStatus === 'Pending';
});

// Method to calculate working hours
attendanceSchema.methods.calculateWorkingHours = function() {
  if (this.punchIn && this.punchOut) {
    const diffMs = this.punchOut - this.punchIn;
    this.workingHours = diffMs / (1000 * 60 * 60); // Convert to hours
  }
  return this.workingHours;
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
