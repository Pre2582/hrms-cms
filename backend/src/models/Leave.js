import mongoose from 'mongoose';

// Leave Type Schema (Casual, Sick, Earned, LOP)
const leaveTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Leave type name is required'],
        enum: ['Casual', 'Sick', 'Earned', 'LOP', 'Maternity', 'Paternity', 'Compensatory'],
        unique: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: ''
    },
    defaultDays: {
        type: Number,
        required: true,
        default: 0
    },
    carryForward: {
        type: Boolean,
        default: false
    },
    maxCarryForward: {
        type: Number,
        default: 0
    },
    isPaid: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Leave Balance Schema (per employee per year)
const leaveBalanceSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        ref: 'Employee'
    },
    year: {
        type: Number,
        required: true,
        default: () => new Date().getFullYear()
    },
    balances: [{
        leaveType: {
            type: String,
            required: true
        },
        allocated: {
            type: Number,
            default: 0
        },
        used: {
            type: Number,
            default: 0
        },
        pending: {
            type: Number,
            default: 0
        },
        available: {
            type: Number,
            default: 0
        },
        carryForward: {
            type: Number,
            default: 0
        }
    }]
}, { timestamps: true });

leaveBalanceSchema.index({ employeeId: 1, year: 1 }, { unique: true });

// Leave Request Schema
const leaveRequestSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        ref: 'Employee'
    },
    leaveType: {
        type: String,
        required: [true, 'Leave type is required'],
        enum: ['Casual', 'Sick', 'Earned', 'LOP', 'Maternity', 'Paternity', 'Compensatory']
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    numberOfDays: {
        type: Number,
        required: true
    },
    isHalfDay: {
        type: Boolean,
        default: false
    },
    halfDayType: {
        type: String,
        enum: ['First Half', 'Second Half', null],
        default: null
    },
    reason: {
        type: String,
        required: [true, 'Reason is required']
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
        default: 'Pending'
    },
    appliedOn: {
        type: Date,
        default: Date.now
    },
    approvedBy: {
        type: String,
        default: ''
    },
    approvedOn: {
        type: Date,
        default: null
    },
    rejectionReason: {
        type: String,
        default: ''
    },
    attachments: [{
        fileName: String,
        filePath: String
    }],
    remarks: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Holiday Schema
const holidaySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Holiday name is required']
    },
    date: {
        type: Date,
        required: [true, 'Holiday date is required']
    },
    type: {
        type: String,
        enum: ['National', 'Regional', 'Company', 'Optional'],
        default: 'Company'
    },
    description: {
        type: String,
        default: ''
    },
    isOptional: {
        type: Boolean,
        default: false
    },
    year: {
        type: Number,
        required: true,
        default: () => new Date().getFullYear()
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

holidaySchema.index({ date: 1, year: 1 });

export const LeaveType = mongoose.model('LeaveType', leaveTypeSchema);
export const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);
export const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
export const Holiday = mongoose.model('Holiday', holidaySchema);
