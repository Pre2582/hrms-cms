import mongoose from 'mongoose';

// Salary Structure Schema
const salaryStructureSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        ref: 'Employee',
        unique: true
    },
    basic: {
        type: Number,
        required: [true, 'Basic salary is required'],
        min: 0
    },
    hra: {
        type: Number,
        default: 0,
        min: 0
    },
    allowances: {
        conveyance: { type: Number, default: 0 },
        medical: { type: Number, default: 0 },
        special: { type: Number, default: 0 },
        lta: { type: Number, default: 0 },
        food: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
    },
    deductions: {
        pf: { type: Number, default: 0 },
        esi: { type: Number, default: 0 },
        professionalTax: { type: Number, default: 0 },
        tds: { type: Number, default: 0 },
        loanRecovery: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
    },
    grossSalary: {
        type: Number,
        default: 0
    },
    netSalary: {
        type: Number,
        default: 0
    },
    ctc: {
        type: Number,
        default: 0
    },
    effectiveFrom: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Pre-save hook to calculate gross and net salary
salaryStructureSchema.pre('save', function (next) {
    const allowanceTotal = Object.values(this.allowances).reduce((sum, val) => sum + (val || 0), 0);
    const deductionTotal = Object.values(this.deductions).reduce((sum, val) => sum + (val || 0), 0);

    this.grossSalary = this.basic + this.hra + allowanceTotal;
    this.netSalary = this.grossSalary - deductionTotal;
    this.ctc = this.grossSalary + (this.deductions.pf || 0); // Employer PF contribution

    next();
});

// Monthly Payroll Schema
const payrollSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        ref: 'Employee'
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    year: {
        type: Number,
        required: true
    },
    // Earnings
    earnings: {
        basic: { type: Number, default: 0 },
        hra: { type: Number, default: 0 },
        conveyance: { type: Number, default: 0 },
        medical: { type: Number, default: 0 },
        special: { type: Number, default: 0 },
        lta: { type: Number, default: 0 },
        food: { type: Number, default: 0 },
        otherAllowances: { type: Number, default: 0 },
        bonus: { type: Number, default: 0 },
        incentive: { type: Number, default: 0 },
        overtime: { type: Number, default: 0 },
        arrears: { type: Number, default: 0 }
    },
    // Deductions
    deductions: {
        pf: { type: Number, default: 0 },
        esi: { type: Number, default: 0 },
        professionalTax: { type: Number, default: 0 },
        tds: { type: Number, default: 0 },
        loanRecovery: { type: Number, default: 0 },
        lopDeduction: { type: Number, default: 0 },
        otherDeductions: { type: Number, default: 0 }
    },
    // Attendance info
    attendance: {
        workingDays: { type: Number, default: 0 },
        presentDays: { type: Number, default: 0 },
        absentDays: { type: Number, default: 0 },
        lopDays: { type: Number, default: 0 },
        paidLeaveDays: { type: Number, default: 0 },
        holidays: { type: Number, default: 0 },
        weekoffs: { type: Number, default: 0 }
    },
    // Totals
    grossEarnings: {
        type: Number,
        default: 0
    },
    totalDeductions: {
        type: Number,
        default: 0
    },
    netPayable: {
        type: Number,
        default: 0
    },
    // Status
    status: {
        type: String,
        enum: ['Draft', 'Processed', 'Approved', 'Paid', 'Locked'],
        default: 'Draft'
    },
    processedBy: {
        type: String,
        default: ''
    },
    processedOn: {
        type: Date,
        default: null
    },
    approvedBy: {
        type: String,
        default: ''
    },
    approvedOn: {
        type: Date,
        default: null
    },
    paidOn: {
        type: Date,
        default: null
    },
    paymentMode: {
        type: String,
        enum: ['Bank Transfer', 'Cheque', 'Cash', 'UPI'],
        default: 'Bank Transfer'
    },
    bankDetails: {
        bankName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        ifscCode: { type: String, default: '' },
        transactionId: { type: String, default: '' }
    },
    remarks: {
        type: String,
        default: ''
    },
    isLocked: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

// Pre-save hook to calculate totals
payrollSchema.pre('save', function (next) {
    const earningsTotal = Object.values(this.earnings).reduce((sum, val) => sum + (val || 0), 0);
    const deductionsTotal = Object.values(this.deductions).reduce((sum, val) => sum + (val || 0), 0);

    this.grossEarnings = earningsTotal;
    this.totalDeductions = deductionsTotal;
    this.netPayable = earningsTotal - deductionsTotal;

    next();
});

// Bonus Schema
const bonusSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        ref: 'Employee'
    },
    type: {
        type: String,
        enum: ['Performance Bonus', 'Festival Bonus', 'Annual Bonus', 'Referral Bonus', 'Incentive', 'Other'],
        required: true
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: 0
    },
    month: {
        type: Number,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Paid', 'Cancelled'],
        default: 'Pending'
    },
    approvedBy: {
        type: String,
        default: ''
    },
    approvedOn: {
        type: Date,
        default: null
    },
    paidOn: {
        type: Date,
        default: null
    },
    includedInPayroll: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Payroll Config Schema (company-wide settings)
const payrollConfigSchema = new mongoose.Schema({
    pfPercentage: {
        type: Number,
        default: 12 // 12% of basic
    },
    esiPercentage: {
        type: Number,
        default: 0.75 // 0.75% for employee
    },
    esiThreshold: {
        type: Number,
        default: 21000 // ESI applicable if gross <= 21000
    },
    professionalTaxSlab: [{
        minSalary: Number,
        maxSalary: Number,
        tax: Number
    }],
    payrollProcessingDay: {
        type: Number,
        default: 28 // Process payroll on 28th
    },
    paymentDay: {
        type: Number,
        default: 1 // Pay on 1st of next month
    },
    financialYearStart: {
        type: Number,
        default: 4 // April
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const SalaryStructure = mongoose.model('SalaryStructure', salaryStructureSchema);
export const Payroll = mongoose.model('Payroll', payrollSchema);
export const Bonus = mongoose.model('Bonus', bonusSchema);
export const PayrollConfig = mongoose.model('PayrollConfig', payrollConfigSchema);
