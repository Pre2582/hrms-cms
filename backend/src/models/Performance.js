import mongoose from 'mongoose';

// Goal/KPI Schema
const goalSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        ref: 'Employee'
    },
    title: {
        type: String,
        required: [true, 'Goal title is required']
    },
    description: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        enum: ['Individual', 'Team', 'Organizational'],
        default: 'Individual'
    },
    type: {
        type: String,
        enum: ['KPI', 'OKR', 'Project', 'Skill Development', 'Other'],
        default: 'KPI'
    },
    targetValue: {
        type: String,
        default: ''
    },
    currentValue: {
        type: String,
        default: ''
    },
    unit: {
        type: String,
        default: ''
    },
    weightage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'Completed', 'Delayed', 'Cancelled'],
        default: 'Not Started'
    },
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    assignedBy: {
        type: String,
        default: ''
    },
    reviewCycle: {
        type: String,
        enum: ['Quarterly', 'Half-Yearly', 'Annual'],
        default: 'Quarterly'
    }
}, { timestamps: true });

// Performance Review Schema
const performanceReviewSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        ref: 'Employee'
    },
    reviewPeriod: {
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        }
    },
    reviewType: {
        type: String,
        enum: ['Quarterly', 'Half-Yearly', 'Annual', 'Probation'],
        required: true
    },
    // Self Review
    selfReview: {
        achievements: { type: String, default: '' },
        challenges: { type: String, default: '' },
        areasOfImprovement: { type: String, default: '' },
        trainingNeeds: { type: String, default: '' },
        comments: { type: String, default: '' },
        submittedOn: { type: Date, default: null }
    },
    // Manager Review
    managerReview: {
        strengths: { type: String, default: '' },
        weaknesses: { type: String, default: '' },
        achievements: { type: String, default: '' },
        areasOfImprovement: { type: String, default: '' },
        recommendations: { type: String, default: '' },
        comments: { type: String, default: '' },
        reviewedBy: { type: String, default: '' },
        reviewedOn: { type: Date, default: null }
    },
    // Ratings
    ratings: {
        technical: { type: Number, min: 1, max: 5, default: 0 },
        communication: { type: Number, min: 1, max: 5, default: 0 },
        teamwork: { type: Number, min: 1, max: 5, default: 0 },
        leadership: { type: Number, min: 1, max: 5, default: 0 },
        problemSolving: { type: Number, min: 1, max: 5, default: 0 },
        initiative: { type: Number, min: 1, max: 5, default: 0 },
        punctuality: { type: Number, min: 1, max: 5, default: 0 },
        quality: { type: Number, min: 1, max: 5, default: 0 }
    },
    overallRating: {
        type: Number,
        min: 1,
        max: 5,
        default: 0
    },
    performanceBand: {
        type: String,
        enum: ['Outstanding', 'Exceeds Expectations', 'Meets Expectations', 'Needs Improvement', 'Unsatisfactory', 'Not Rated'],
        default: 'Not Rated'
    },
    // Goals Achievement
    goalsAchieved: {
        type: Number,
        default: 0
    },
    totalGoals: {
        type: Number,
        default: 0
    },
    // Status
    status: {
        type: String,
        enum: ['Pending Self Review', 'Pending Manager Review', 'Completed', 'Acknowledged'],
        default: 'Pending Self Review'
    },
    // Promotion & Increment
    recommendedForPromotion: {
        type: Boolean,
        default: false
    },
    recommendedIncrement: {
        type: Number,
        default: 0
    },
    promotionDetails: {
        newDesignation: { type: String, default: '' },
        effectiveDate: { type: Date, default: null },
        reason: { type: String, default: '' }
    },
    // Acknowledgment
    employeeAcknowledged: {
        type: Boolean,
        default: false
    },
    acknowledgedOn: {
        type: Date,
        default: null
    },
    employeeComments: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Pre-save hook to calculate overall rating
performanceReviewSchema.pre('save', function (next) {
    const ratings = this.ratings;
    const ratingValues = Object.values(ratings).filter(r => r > 0);

    if (ratingValues.length > 0) {
        this.overallRating = parseFloat((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(2));

        // Determine performance band
        if (this.overallRating >= 4.5) this.performanceBand = 'Outstanding';
        else if (this.overallRating >= 3.5) this.performanceBand = 'Exceeds Expectations';
        else if (this.overallRating >= 2.5) this.performanceBand = 'Meets Expectations';
        else if (this.overallRating >= 1.5) this.performanceBand = 'Needs Improvement';
        else this.performanceBand = 'Unsatisfactory';
    }

    next();
});

// Promotion & Increment Tracking Schema
const promotionSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        ref: 'Employee'
    },
    type: {
        type: String,
        enum: ['Promotion', 'Increment', 'Designation Change', 'Grade Change'],
        required: true
    },
    previousDesignation: {
        type: String,
        default: ''
    },
    newDesignation: {
        type: String,
        default: ''
    },
    previousSalary: {
        type: Number,
        default: 0
    },
    newSalary: {
        type: Number,
        default: 0
    },
    incrementPercentage: {
        type: Number,
        default: 0
    },
    incrementAmount: {
        type: Number,
        default: 0
    },
    effectiveDate: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        default: ''
    },
    basedOnReview: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PerformanceReview',
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
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Implemented', 'Rejected'],
        default: 'Pending'
    },
    remarks: {
        type: String,
        default: ''
    }
}, { timestamps: true });

export const Goal = mongoose.model('Goal', goalSchema);
export const PerformanceReview = mongoose.model('PerformanceReview', performanceReviewSchema);
export const Promotion = mongoose.model('Promotion', promotionSchema);
