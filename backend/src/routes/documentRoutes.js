import express from 'express';
import {
    getDocuments,
    getDocumentById,
    createDocument,
    updateDocument,
    deleteDocument,
    trackDownload,
    acknowledgeDocument,
    getDocumentsByCategory,
    getEmployeeDocuments,
    searchDocuments,
    getDocumentStats,
    initializeSampleDocuments
} from '../controllers/documentController.js';

const router = express.Router();

// Statistics
router.get('/stats', getDocumentStats);

// Initialize sample documents
router.post('/initialize', initializeSampleDocuments);

// Search
router.get('/search', searchDocuments);

// Documents CRUD
router.get('/', getDocuments);
router.get('/:id', getDocumentById);
router.post('/', createDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

// Download tracking
router.post('/:id/download', trackDownload);

// Acknowledgment
router.post('/:id/acknowledge', acknowledgeDocument);

// Category-specific
router.get('/category/:category', getDocumentsByCategory);

// Employee-specific
router.get('/employee/:employeeId', getEmployeeDocuments);

export default router;
