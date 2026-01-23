import { Document } from '../models/Document.js';
import Employee from '../models/Employee.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== DOCUMENT MANAGEMENT ====================

// Get all documents
export const getDocuments = async (req, res) => {
    try {
        const { category, documentType, employeeId, accessLevel } = req.query;
        let query = { isActive: true };

        if (category) query.category = category;
        if (documentType) query.documentType = documentType;
        if (employeeId) query.employeeId = employeeId;
        if (accessLevel) query.accessLevel = accessLevel;

        const documents = await Document.find(query).sort({ uploadedOn: -1 });

        const enrichedDocs = await Promise.all(documents.map(async (doc) => {
            if (doc.employeeId) {
                const employee = await Employee.findOne({ employeeId: doc.employeeId });
                return { ...doc.toObject(), employeeName: employee?.fullName || doc.employeeId };
            }
            return doc.toObject();
        }));

        res.status(200).json({ success: true, count: enrichedDocs.length, data: enrichedDocs });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching documents', error: error.message });
    }
};

// Get document by ID
export const getDocumentById = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

        res.status(200).json({ success: true, data: document });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create document (metadata only - for demo without actual file upload)
export const createDocument = async (req, res) => {
    try {
        const documentData = {
            ...req.body,
            uploadedBy: req.body.uploadedBy || 'HR Admin',
            uploadedOn: new Date(),
            // For demo purposes, we'll use a mock file path
            filePath: `/uploads/documents/${Date.now()}_${req.body.fileName}`,
            fileUrl: `/api/documents/download/${Date.now()}_${req.body.fileName}`
        };

        const document = await Document.create(documentData);
        res.status(201).json({ success: true, message: 'Document created successfully', data: document });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Update document metadata
export const updateDocument = async (req, res) => {
    try {
        const document = await Document.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

        res.status(200).json({ success: true, message: 'Document updated', data: document });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Delete document (soft delete)
export const deleteDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

        document.isActive = false;
        await document.save();

        res.status(200).json({ success: true, message: 'Document deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Track document download
export const trackDownload = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

        document.downloadCount += 1;
        document.lastAccessedOn = new Date();
        document.lastAccessedBy = req.body.accessedBy || 'Unknown';

        await document.save();

        // In a real implementation, this would serve the actual file
        res.status(200).json({
            success: true,
            message: 'Download tracked',
            data: {
                fileName: document.fileName,
                fileUrl: document.fileUrl,
                filePath: document.filePath
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Acknowledge document
export const acknowledgeDocument = async (req, res) => {
    try {
        const { employeeId } = req.body;
        const document = await Document.findById(req.params.id);

        if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

        const alreadyAcknowledged = document.acknowledgedBy.some(
            ack => ack.employeeId === employeeId
        );

        if (alreadyAcknowledged) {
            return res.status(400).json({ success: false, message: 'Document already acknowledged by this employee' });
        }

        document.acknowledgedBy.push({
            employeeId,
            acknowledgedOn: new Date(),
            ipAddress: req.ip || 'Unknown'
        });

        await document.save();

        res.status(200).json({ success: true, message: 'Document acknowledged', data: document });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get documents by category
export const getDocumentsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const documents = await Document.find({ category, isActive: true }).sort({ uploadedOn: -1 });

        res.status(200).json({ success: true, count: documents.length, data: documents });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get employee-specific documents
export const getEmployeeDocuments = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const documents = await Document.find({
            employeeId,
            isActive: true,
            documentType: 'Employee Specific'
        }).sort({ uploadedOn: -1 });

        res.status(200).json({ success: true, count: documents.length, data: documents });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Search documents
export const searchDocuments = async (req, res) => {
    try {
        const { query } = req.query;

        const documents = await Document.find({
            isActive: true,
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { tags: { $in: [new RegExp(query, 'i')] } }
            ]
        }).sort({ uploadedOn: -1 });

        res.status(200).json({ success: true, count: documents.length, data: documents });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get document statistics
export const getDocumentStats = async (req, res) => {
    try {
        const totalDocuments = await Document.countDocuments({ isActive: true });
        const totalDownloads = await Document.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: null, total: { $sum: '$downloadCount' } } }
        ]);

        const byCategory = await Document.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);

        const byAccessLevel = await Document.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$accessLevel', count: { $sum: 1 } } }
        ]);

        const pendingAcknowledgments = await Document.countDocuments({
            isActive: true,
            requiresAcknowledgment: true,
            'acknowledgedBy.0': { $exists: false }
        });

        const recentUploads = await Document.find({ isActive: true })
            .sort({ uploadedOn: -1 })
            .limit(5)
            .select('title category uploadedOn');

        res.status(200).json({
            success: true,
            data: {
                totalDocuments,
                totalDownloads: totalDownloads[0]?.total || 0,
                byCategory: byCategory.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                byAccessLevel: byAccessLevel.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                pendingAcknowledgments,
                recentUploads
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Initialize sample documents
export const initializeSampleDocuments = async (req, res) => {
    try {
        const sampleDocs = [
            {
                title: 'Employee Handbook 2024',
                description: 'Complete guide to company policies and procedures',
                category: 'Company Policy',
                documentType: 'General',
                fileName: 'employee_handbook_2024.pdf',
                fileSize: 2048000,
                fileType: 'application/pdf',
                filePath: '/uploads/documents/employee_handbook_2024.pdf',
                fileUrl: '/api/documents/download/employee_handbook_2024.pdf',
                accessLevel: 'Public',
                allowedRoles: ['Admin', 'HR', 'Manager', 'Employee'],
                version: '1.0',
                uploadedBy: 'HR Admin',
                requiresAcknowledgment: true,
                tags: ['policy', 'handbook', 'guidelines']
            },
            {
                title: 'Code of Conduct',
                description: 'Professional code of conduct and ethics',
                category: 'Company Policy',
                documentType: 'General',
                fileName: 'code_of_conduct.pdf',
                fileSize: 1024000,
                fileType: 'application/pdf',
                filePath: '/uploads/documents/code_of_conduct.pdf',
                fileUrl: '/api/documents/download/code_of_conduct.pdf',
                accessLevel: 'Public',
                allowedRoles: ['Admin', 'HR', 'Manager', 'Employee'],
                version: '1.0',
                uploadedBy: 'HR Admin',
                requiresAcknowledgment: true,
                tags: ['conduct', 'ethics', 'policy']
            },
            {
                title: 'Leave Policy',
                description: 'Annual leave, sick leave, and other leave policies',
                category: 'Company Policy',
                documentType: 'General',
                fileName: 'leave_policy.pdf',
                fileSize: 512000,
                fileType: 'application/pdf',
                filePath: '/uploads/documents/leave_policy.pdf',
                fileUrl: '/api/documents/download/leave_policy.pdf',
                accessLevel: 'Public',
                allowedRoles: ['Admin', 'HR', 'Manager', 'Employee'],
                version: '2.0',
                uploadedBy: 'HR Admin',
                tags: ['leave', 'policy', 'benefits']
            },
            {
                title: 'NDA Template',
                description: 'Non-Disclosure Agreement template for new hires',
                category: 'NDA',
                documentType: 'General',
                fileName: 'nda_template.pdf',
                fileSize: 256000,
                fileType: 'application/pdf',
                filePath: '/uploads/documents/nda_template.pdf',
                fileUrl: '/api/documents/download/nda_template.pdf',
                accessLevel: 'HR Only',
                allowedRoles: ['Admin', 'HR'],
                version: '1.0',
                uploadedBy: 'HR Admin',
                requiresAcknowledgment: true,
                tags: ['nda', 'confidentiality', 'legal']
            },
            {
                title: 'Offer Letter Template',
                description: 'Standard offer letter template',
                category: 'Offer Letter',
                documentType: 'General',
                fileName: 'offer_letter_template.docx',
                fileSize: 128000,
                fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                filePath: '/uploads/documents/offer_letter_template.docx',
                fileUrl: '/api/documents/download/offer_letter_template.docx',
                accessLevel: 'HR Only',
                allowedRoles: ['Admin', 'HR'],
                version: '1.0',
                uploadedBy: 'HR Admin',
                tags: ['offer', 'recruitment', 'template']
            }
        ];

        await Document.insertMany(sampleDocs);

        res.status(201).json({
            success: true,
            message: `${sampleDocs.length} sample documents created`,
            data: sampleDocs
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
