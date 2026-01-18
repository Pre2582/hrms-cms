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
      values: ['Present', 'Absent'],
      message: 'Status must be either Present or Absent'
    }
  }
}, {
  timestamps: true
});

// Create compound index to prevent duplicate attendance for same employee on same date
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
