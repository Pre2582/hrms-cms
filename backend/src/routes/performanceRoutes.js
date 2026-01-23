import express from 'express';
import {
    getGoals, createGoal, updateGoal, deleteGoal, updateGoalProgress,
    getReviews, createReview, submitSelfReview, submitManagerReview, acknowledgeReview, getReviewById,
    getPromotions, createPromotion, approvePromotion, implementPromotion,
    getPerformanceStats, getEmployeePerformanceHistory
} from '../controllers/performanceController.js';

const router = express.Router();

// Dashboard stats
router.get('/stats', getPerformanceStats);

// Goals/KPIs
router.get('/goals', getGoals);
router.post('/goals', createGoal);
router.put('/goals/:id', updateGoal);
router.delete('/goals/:id', deleteGoal);
router.put('/goals/:id/progress', updateGoalProgress);

// Performance Reviews
router.get('/reviews', getReviews);
router.get('/reviews/:id', getReviewById);
router.post('/reviews', createReview);
router.put('/reviews/:id/self-review', submitSelfReview);
router.put('/reviews/:id/manager-review', submitManagerReview);
router.put('/reviews/:id/acknowledge', acknowledgeReview);

// Promotions & Increments
router.get('/promotions', getPromotions);
router.post('/promotions', createPromotion);
router.put('/promotions/:id/approve', approvePromotion);
router.put('/promotions/:id/implement', implementPromotion);

// Employee performance history
router.get('/history/:employeeId', getEmployeePerformanceHistory);

export default router;
