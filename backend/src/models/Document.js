import mongoose from 'mongoose';

// Document Schema
const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Document title is required']
    },
    description: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        enum: ['Company Policy', 'Offer Letter', 'Appointment Letter', 'NDA', 'Compliance', 'Contract', 'Certificate', 'Other'],
        required: true
    },
    documentType: {
        type: String,
        enum: ['General', 'Employee Specific'],
        default: 'General'
    },
    // For employee-specific documents
    employeeId: {
        type: String,
        ref: 'Employee',
        default: null
    },
    // File information
    fileName: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        default: 0
    },
    fileType: {
        type: String,
        default: ''
    },
    filePath: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        default: ''
    },
    // Access control
    accessLevel: {
        type: String,
        enum: ['Public', 'HR Only', 'Employee Specific', 'Confidential'],
        default: 'HR Only'
    },
    allowedRoles: [{
        type: String,
        enum: ['Admin', 'HR', 'Manager', 'Employee']
    }],
    // Version control
    version: {
        type: String,
        default: '1.0'
    },
    previousVersions: [{
        version: String,
        filePath: String,
        uploadedOn: Date,
        uploadedBy: String
    }],
    // Metadata
    uploadedBy: {
        type: String,
        required: true
    },
    uploadedOn: {
        type: Date,
        default: Date.now
    },
    expiryDate: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    tags: [{
        type: String
    }],
    // Tracking
    downloadCount: {
        type: Number,
        default: 0
    },
    lastAccessedOn: {
        type: Date,
        default: null
    },
    lastAccessedBy: {
        type: String,
        default: ''
    },
    // Signature/Acknowledgment
    requiresAcknowledgment: {
        type: Boolean,
        default: false
    },
    acknowledgedBy: [{
        employeeId: String,
        acknowledgedOn: Date,
        ipAddress: String
    }]
}, { timestamps: true });

documentSchema.index({ category: 1, isActive: 1 });
documentSchema.index({ employeeId: 1 });
documentSchema.index({ uploadedOn: -1 });

export const Document = mongoose.model('Document', documentSchema);
