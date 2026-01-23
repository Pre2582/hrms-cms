import { Goal, PerformanceReview, Promotion } from '../models/Performance.js';
import Employee from '../models/Employee.js';

// ==================== GOAL/KPI MANAGEMENT ====================

// Get all goals
export const getGoals = async (req, res) => {
    try {
        const { employeeId, status, type } = req.query;
        let query = {};

        if (employeeId) query.employeeId = employeeId;
        if (status) query.status = status;
        if (type) query.type = type;

        const goals = await Goal.find(query).sort({ createdAt: -1 });

        const enrichedGoals = await Promise.all(goals.map(async (goal) => {
            const employee = await Employee.findOne({ employeeId: goal.employeeId });
            return { ...goal.toObject(), employeeName: employee?.fullName || goal.employeeId };
        }));

        res.status(200).json({ success: true, count: enrichedGoals.length, data: enrichedGoals });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching goals', error: error.message });
    }
};

// Create goal
export const createGoal = async (req, res) => {
    try {
        const goal = await Goal.create(req.body);
        res.status(201).json({ success: true, message: 'Goal created successfully', data: goal });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Update goal
export const updateGoal = async (req, res) => {
    try {
        const goal = await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
        res.status(200).json({ success: true, message: 'Goal updated', data: goal });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Delete goal
export const deleteGoal = async (req, res) => {
    try {
        const goal = await Goal.findByIdAndDelete(req.params.id);
        if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
        res.status(200).json({ success: true, message: 'Goal deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update goal progress
export const updateGoalProgress = async (req, res) => {
    try {
        const { progress, currentValue, status } = req.body;
        const goal = await Goal.findById(req.params.id);

        if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

        if (progress !== undefined) goal.progress = progress;
        if (currentValue !== undefined) goal.currentValue = currentValue;
        if (status) goal.status = status;

        await goal.save();
        res.status(200).json({ success: true, message: 'Progress updated', data: goal });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ==================== PERFORMANCE REVIEW MANAGEMENT ====================

// Get all reviews
export const getReviews = async (req, res) => {
    try {
        const { employeeId, status, reviewType } = req.query;
        let query = {};

        if (employeeId) query.employeeId = employeeId;
        if (status) query.status = status;
        if (reviewType) query.reviewType = reviewType;

        const reviews = await PerformanceReview.find(query).sort({ createdAt: -1 });

        const enrichedReviews = await Promise.all(reviews.map(async (review) => {
            const employee = await Employee.findOne({ employeeId: review.employeeId });
            return { ...review.toObject(), employeeName: employee?.fullName || review.employeeId, department: employee?.department || '' };
        }));

        res.status(200).json({ success: true, count: enrichedReviews.length, data: enrichedReviews });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching reviews', error: error.message });
    }
};

// Create review
export const createReview = async (req, res) => {
    try {
        const { employeeId, reviewPeriod, reviewType } = req.body;

        const employee = await Employee.findOne({ employeeId });
        if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

        // Check for existing review in same period
        const existing = await PerformanceReview.findOne({
            employeeId,
            'reviewPeriod.startDate': reviewPeriod.startDate,
            'reviewPeriod.endDate': reviewPeriod.endDate
        });

        if (existing) return res.status(400).json({ success: false, message: 'Review already exists for this period' });

        // Get goals for this period
        const goals = await Goal.find({
            employeeId,
            startDate: { $lte: new Date(reviewPeriod.endDate) },
            endDate: { $gte: new Date(reviewPeriod.startDate) }
        });

        const review = await PerformanceReview.create({
            employeeId,
            reviewPeriod,
            reviewType,
            totalGoals: goals.length,
            goalsAchieved: goals.filter(g => g.status === 'Completed').length
        });

        res.status(201).json({ success: true, message: 'Review created', data: review });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Submit self review
export const submitSelfReview = async (req, res) => {
    try {
        const review = await PerformanceReview.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        review.selfReview = {
            ...req.body,
            submittedOn: new Date()
        };
        review.status = 'Pending Manager Review';

        await review.save();
        res.status(200).json({ success: true, message: 'Self review submitted', data: review });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Submit manager review
export const submitManagerReview = async (req, res) => {
    try {
        const review = await PerformanceReview.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        const { managerReview, ratings, recommendedForPromotion, recommendedIncrement, promotionDetails } = req.body;

        review.managerReview = {
            ...managerReview,
            reviewedOn: new Date()
        };

        if (ratings) review.ratings = ratings;
        if (recommendedForPromotion !== undefined) review.recommendedForPromotion = recommendedForPromotion;
        if (recommendedIncrement !== undefined) review.recommendedIncrement = recommendedIncrement;
        if (promotionDetails) review.promotionDetails = promotionDetails;

        review.status = 'Completed';

        await review.save();
        res.status(200).json({ success: true, message: 'Manager review submitted', data: review });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Acknowledge review
export const acknowledgeReview = async (req, res) => {
    try {
        const review = await PerformanceReview.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        review.employeeAcknowledged = true;
        review.acknowledgedOn = new Date();
        review.employeeComments = req.body.comments || '';
        review.status = 'Acknowledged';

        await review.save();
        res.status(200).json({ success: true, message: 'Review acknowledged', data: review });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get review by ID
export const getReviewById = async (req, res) => {
    try {
        const review = await PerformanceReview.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        const employee = await Employee.findOne({ employeeId: review.employeeId });
        const enrichedReview = { ...review.toObject(), employeeName: employee?.fullName, department: employee?.department };

        res.status(200).json({ success: true, data: enrichedReview });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== PROMOTION & INCREMENT MANAGEMENT ====================

// Get all promotions
export const getPromotions = async (req, res) => {
    try {
        const { employeeId, status, type } = req.query;
        let query = {};

        if (employeeId) query.employeeId = employeeId;
        if (status) query.status = status;
        if (type) query.type = type;

        const promotions = await Promotion.find(query).sort({ createdAt: -1 });

        const enrichedPromotions = await Promise.all(promotions.map(async (promo) => {
            const employee = await Employee.findOne({ employeeId: promo.employeeId });
            return { ...promo.toObject(), employeeName: employee?.fullName || promo.employeeId };
        }));

        res.status(200).json({ success: true, count: enrichedPromotions.length, data: enrichedPromotions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create promotion/increment
export const createPromotion = async (req, res) => {
    try {
        const promotion = await Promotion.create(req.body);
        res.status(201).json({ success: true, message: 'Promotion/Increment created', data: promotion });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Approve promotion
export const approvePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion) return res.status(404).json({ success: false, message: 'Promotion not found' });

        promotion.status = 'Approved';
        promotion.approvedBy = req.body.approvedBy || 'HR Admin';
        promotion.approvedOn = new Date();

        await promotion.save();
        res.status(200).json({ success: true, message: 'Promotion approved', data: promotion });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Implement promotion (update employee record)
export const implementPromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion) return res.status(404).json({ success: false, message: 'Promotion not found' });
        if (promotion.status !== 'Approved') return res.status(400).json({ success: false, message: 'Promotion must be approved first' });

        const employee = await Employee.findOne({ employeeId: promotion.employeeId });
        if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

        // Update employee record
        if (promotion.newDesignation) employee.designation = promotion.newDesignation;
        await employee.save();

        promotion.status = 'Implemented';
        await promotion.save();

        res.status(200).json({ success: true, message: 'Promotion implemented', data: { promotion, employee } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== DASHBOARD & STATISTICS ====================

// Get performance dashboard stats
export const getPerformanceStats = async (req, res) => {
    try {
        const totalGoals = await Goal.countDocuments();
        const completedGoals = await Goal.countDocuments({ status: 'Completed' });
        const inProgressGoals = await Goal.countDocuments({ status: 'In Progress' });

        const pendingSelfReviews = await PerformanceReview.countDocuments({ status: 'Pending Self Review' });
        const pendingManagerReviews = await PerformanceReview.countDocuments({ status: 'Pending Manager Review' });
        const completedReviews = await PerformanceReview.countDocuments({ status: { $in: ['Completed', 'Acknowledged'] } });

        const pendingPromotions = await Promotion.countDocuments({ status: 'Pending' });
        const approvedPromotions = await Promotion.countDocuments({ status: 'Approved' });

        // Average ratings
        const reviews = await PerformanceReview.find({ overallRating: { $gt: 0 } });
        const avgRating = reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length).toFixed(2)
            : 0;

        res.status(200).json({
            success: true,
            data: {
                goals: { total: totalGoals, completed: completedGoals, inProgress: inProgressGoals },
                reviews: { pendingSelf: pendingSelfReviews, pendingManager: pendingManagerReviews, completed: completedReviews },
                promotions: { pending: pendingPromotions, approved: approvedPromotions },
                avgRating: parseFloat(avgRating)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get employee performance history
export const getEmployeePerformanceHistory = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const reviews = await PerformanceReview.find({ employeeId }).sort({ 'reviewPeriod.endDate': -1 });
        const goals = await Goal.find({ employeeId }).sort({ endDate: -1 });
        const promotions = await Promotion.find({ employeeId }).sort({ effectiveDate: -1 });

        res.status(200).json({
            success: true,
            data: { reviews, goals, promotions }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
