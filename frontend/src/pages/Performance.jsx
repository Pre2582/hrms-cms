import { useState, useEffect, useCallback } from 'react';
import { performanceAPI, employeeAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { toast } from 'react-toastify';

const STATUS_COLORS = {
  'Not Started': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  'In Progress': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  'Completed': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  'Delayed': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  'Cancelled': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  'Pending Self Review': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  'Pending Manager Review': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
  'Acknowledged': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  'Pending': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  'Approved': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  'Implemented': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  'Rejected': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
};

const BAND_COLORS = {
  'Outstanding': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
  'Exceeds Expectations': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  'Meets Expectations': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  'Needs Improvement': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
  'Unsatisfactory': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  'Not Rated': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
};

// Star Rating Component
const StarRating = ({ rating, onChange, readonly = false }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange && onChange(star)}
          className={`text-2xl ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform ${
            star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
          }`}
          disabled={readonly}
        >
          ★
        </button>
      ))}
    </div>
  );
};

const Performance = () => {
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState('goals');
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [goals, setGoals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [stats, setStats] = useState({});
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReviewDetailModal, setShowReviewDetailModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [goalForm, setGoalForm] = useState({
    employeeId: '', title: '', description: '', category: 'Individual', type: 'KPI',
    targetValue: '', currentValue: '', unit: '', weightage: 0, startDate: '', endDate: '',
    status: 'Not Started', progress: 0, assignedBy: 'HR Admin', reviewCycle: 'Quarterly'
  });

  const [reviewForm, setReviewForm] = useState({
    employeeId: '', reviewType: 'Quarterly',
    reviewPeriod: { startDate: '', endDate: '' }
  });

  const [selfReviewForm, setSelfReviewForm] = useState({
    achievements: '', challenges: '', areasOfImprovement: '', trainingNeeds: '', comments: ''
  });

  const [managerReviewForm, setManagerReviewForm] = useState({
    managerReview: { strengths: '', weaknesses: '', achievements: '', areasOfImprovement: '', recommendations: '', comments: '', reviewedBy: 'HR Admin' },
    ratings: { technical: 0, communication: 0, teamwork: 0, leadership: 0, problemSolving: 0, initiative: 0, punctuality: 0, quality: 0 },
    recommendedForPromotion: false,
    recommendedIncrement: 0,
    promotionDetails: { newDesignation: '', effectiveDate: '', reason: '' }
  });

  const [promotionForm, setPromotionForm] = useState({
    employeeId: '', type: 'Promotion', previousDesignation: '', newDesignation: '',
    previousSalary: '', newSalary: '', incrementPercentage: 0, incrementAmount: 0,
    effectiveDate: '', reason: '', approvedBy: 'HR Admin'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, goalsRes, reviewsRes, promosRes, statsRes] = await Promise.all([
        employeeAPI.getAll(),
        performanceAPI.getGoals({}),
        performanceAPI.getReviews({}),
        performanceAPI.getPromotions({}),
        performanceAPI.getStats()
      ]);
      setEmployees(empRes.data.data || []);
      setGoals(goalsRes.data.data || []);
      setReviews(reviewsRes.data.data || []);
      setPromotions(promosRes.data.data || []);
      setStats(statsRes.data.data || {});
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await performanceAPI.createGoal(goalForm);
      toast.success('Goal created successfully');
      setShowGoalModal(false);
      resetGoalForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateGoalProgress = async (id, progress, currentValue, status) => {
    try {
      await performanceAPI.updateGoalProgress(id, { progress, currentValue, status });
      toast.success('Progress updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update progress');
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await performanceAPI.deleteGoal(id);
      toast.success('Goal deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete goal');
    }
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await performanceAPI.createReview(reviewForm);
      toast.success('Review created successfully');
      setShowReviewModal(false);
      setReviewForm({ employeeId: '', reviewType: 'Quarterly', reviewPeriod: { startDate: '', endDate: '' } });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitSelfReview = async () => {
    try {
      setSubmitting(true);
      await performanceAPI.submitSelfReview(selectedReview._id, selfReviewForm);
      toast.success('Self review submitted');
      setShowReviewDetailModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to submit self review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitManagerReview = async () => {
    try {
      setSubmitting(true);
      await performanceAPI.submitManagerReview(selectedReview._id, managerReviewForm);
      toast.success('Manager review submitted');
      setShowReviewDetailModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to submit manager review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledgeReview = async () => {
    try {
      await performanceAPI.acknowledgeReview(selectedReview._id, { comments: '' });
      toast.success('Review acknowledged');
      setShowReviewDetailModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to acknowledge review');
    }
  };

  const handleCreatePromotion = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const data = {
        ...promotionForm,
        previousSalary: parseFloat(promotionForm.previousSalary) || 0,
        newSalary: parseFloat(promotionForm.newSalary) || 0,
        incrementPercentage: parseFloat(promotionForm.incrementPercentage) || 0,
        incrementAmount: parseFloat(promotionForm.incrementAmount) || 0
      };
      await performanceAPI.createPromotion(data);
      toast.success('Promotion created');
      setShowPromotionModal(false);
      resetPromotionForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create promotion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePromotion = async (id) => {
    try {
      await performanceAPI.approvePromotion(id, { approvedBy: 'HR Admin' });
      toast.success('Promotion approved');
      fetchData();
    } catch (err) {
      toast.error('Failed to approve promotion');
    }
  };

  const handleImplementPromotion = async (id) => {
    if (!window.confirm('Implement this promotion? This will update the employee record.')) return;
    try {
      await performanceAPI.implementPromotion(id);
      toast.success('Promotion implemented');
      fetchData();
    } catch (err) {
      toast.error('Failed to implement promotion');
    }
  };

  const openReviewDetail = async (review) => {
    setSelectedReview(review);
    if (review.selfReview) setSelfReviewForm(review.selfReview);
    if (review.managerReview) {
      setManagerReviewForm({
        managerReview: review.managerReview,
        ratings: review.ratings,
        recommendedForPromotion: review.recommendedForPromotion,
        recommendedIncrement: review.recommendedIncrement,
        promotionDetails: review.promotionDetails
      });
    }
    setShowReviewDetailModal(true);
  };

  const fillGoalSampleData = () => {
    const titles = ['Increase Sales Revenue', 'Improve Customer Satisfaction', 'Complete Project Delivery', 'Reduce Bug Count', 'Enhance Team Productivity'];
    const types = ['KPI', 'OKR', 'Project'];
    const today = new Date();
    const startDate = new Date(today);
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 3);

    setGoalForm({
      employeeId: employees.length > 0 ? employees[Math.floor(Math.random() * employees.length)].employeeId : '',
      title: titles[Math.floor(Math.random() * titles.length)],
      description: 'Sample goal description for performance tracking',
      category: 'Individual',
      type: types[Math.floor(Math.random() * types.length)],
      targetValue: '100',
      currentValue: '0',
      unit: '%',
      weightage: Math.floor(Math.random() * 30) + 10,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      status: 'Not Started',
      progress: 0,
      assignedBy: 'HR Admin',
      reviewCycle: 'Quarterly'
    });
    toast.success('Sample goal data filled!');
  };

  const fillPromotionSampleData = () => {
    const designations = ['Senior Developer', 'Team Lead', 'Manager', 'Senior Manager'];
    const previousSalary = Math.floor(Math.random() * (80000 - 40000) + 40000);
    const incrementPct = Math.floor(Math.random() * 20) + 10;
    const newSalary = previousSalary + (previousSalary * incrementPct / 100);

    setPromotionForm({
      employeeId: employees.length > 0 ? employees[Math.floor(Math.random() * employees.length)].employeeId : '',
      type: 'Promotion',
      previousDesignation: 'Developer',
      newDesignation: designations[Math.floor(Math.random() * designations.length)],
      previousSalary: previousSalary.toString(),
      newSalary: newSalary.toString(),
      incrementPercentage: incrementPct,
      incrementAmount: (newSalary - previousSalary).toString(),
      effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reason: 'Excellent performance and leadership skills',
      approvedBy: 'HR Admin'
    });
    toast.success('Sample promotion data filled!');
  };

  const resetGoalForm = () => {
    setGoalForm({
      employeeId: '', title: '', description: '', category: 'Individual', type: 'KPI',
      targetValue: '', currentValue: '', unit: '', weightage: 0, startDate: '', endDate: '',
      status: 'Not Started', progress: 0, assignedBy: 'HR Admin', reviewCycle: 'Quarterly'
    });
  };

  const resetPromotionForm = () => {
    setPromotionForm({
      employeeId: '', type: 'Promotion', previousDesignation: '', newDesignation: '',
      previousSalary: '', newSalary: '', incrementPercentage: 0, incrementAmount: 0,
      effectiveDate: '', reason: '', approvedBy: 'HR Admin'
    });
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Performance Management</h1>
        <SkeletonLoader type="table" rows={5} columns={4} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Performance Management</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.goals?.completed || 0}/{stats.goals?.total || 0}</div>
          <div className="text-sm text-blue-700 dark:text-blue-300">Goals Completed</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.reviews?.pendingSelf || 0}</div>
          <div className="text-sm text-yellow-700 dark:text-yellow-300">Pending Self Reviews</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.reviews?.pendingManager || 0}</div>
          <div className="text-sm text-orange-700 dark:text-orange-300">Pending Manager Reviews</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.promotions?.pending || 0}</div>
          <div className="text-sm text-green-700 dark:text-green-300">Pending Promotions</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.avgRating || 0}/5</div>
          <div className="text-sm text-purple-700 dark:text-purple-300">Average Rating</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {['goals', 'reviews', 'promotions'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${activeTab === tab 
              ? 'text-primary-600 border-b-2 border-primary-600' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            {tab === 'goals' ? 'Goals & KPIs' : tab === 'reviews' ? 'Performance Reviews' : 'Promotions & Increments'}
          </button>
        ))}
      </div>

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowGoalModal(true)}>+ Create Goal</Button>
          </div>
          {goals.length === 0 ? (
            <EmptyState title="No goals" description="Create goals to track performance" icon="🎯" />
          ) : (
            <div className="grid gap-4">
              {goals.map(goal => (
                <div key={goal._id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{goal.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{goal.employeeName} • {goal.type}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[goal.status]}`}>{goal.status}</span>
                      <button onClick={() => handleDeleteGoal(goal._id)} className="text-red-500 hover:text-red-700">✕</button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{goal.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="text-sm"><span className="text-gray-500">Target:</span> {goal.targetValue} {goal.unit}</div>
                    <div className="text-sm"><span className="text-gray-500">Current:</span> {goal.currentValue} {goal.unit}</div>
                    <div className="text-sm"><span className="text-gray-500">Weightage:</span> {goal.weightage}%</div>
                    <div className="text-sm"><span className="text-gray-500">Period:</span> {formatDate(goal.startDate)} - {formatDate(goal.endDate)}</div>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="font-semibold">{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${goal.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowReviewModal(true)}>+ Create Review</Button>
          </div>
          {reviews.length === 0 ? (
            <EmptyState title="No reviews" description="Create performance reviews" icon="⭐" />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {['Employee', 'Type', 'Period', 'Rating', 'Band', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {reviews.map(review => (
                      <tr key={review._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{review.employeeName}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{review.reviewType}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(review.reviewPeriod.startDate)} - {formatDate(review.reviewPeriod.endDate)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-400">★</span>
                            <span className="text-sm font-semibold">{review.overallRating || 0}/5</span>
                          </div>
                        </td>
                        <td className="px-4 py-4"><span className={`px-2 py-1 text-xs rounded-full ${BAND_COLORS[review.performanceBand]}`}>{review.performanceBand}</span></td>
                        <td className="px-4 py-4"><span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[review.status]}`}>{review.status}</span></td>
                        <td className="px-4 py-4">
                          <button onClick={() => openReviewDetail(review)} className="text-xs text-primary-600 hover:underline">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Promotions Tab */}
      {activeTab === 'promotions' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowPromotionModal(true)}>+ Create Promotion</Button>
          </div>
          {promotions.length === 0 ? (
            <EmptyState title="No promotions" description="Track promotions and increments" icon="📈" />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {['Employee', 'Type', 'Previous → New', 'Increment', 'Effective Date', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {promotions.map(promo => (
                      <tr key={promo._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{promo.employeeName}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{promo.type}</td>
                        <td className="px-4 py-4 text-sm">
                          {promo.previousDesignation && <div className="text-gray-500">{promo.previousDesignation} → {promo.newDesignation}</div>}
                          {promo.previousSalary > 0 && <div className="text-gray-500">₹{promo.previousSalary.toLocaleString()} → ₹{promo.newSalary.toLocaleString()}</div>}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-green-600">{promo.incrementPercentage}% (₹{promo.incrementAmount.toLocaleString()})</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(promo.effectiveDate)}</td>
                        <td className="px-4 py-4"><span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[promo.status]}`}>{promo.status}</span></td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            {promo.status === 'Pending' && (
                              <button onClick={() => handleApprovePromotion(promo._id)} className="text-xs text-green-600 hover:underline">Approve</button>
                            )}
                            {promo.status === 'Approved' && (
                              <button onClick={() => handleImplementPromotion(promo._id)} className="text-xs text-blue-600 hover:underline">Implement</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Goal Modal */}
      <Modal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)} title="Create Goal">
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={fillGoalSampleData} className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Fill with Sample Data
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee *</label>
            <select value={goalForm.employeeId} onChange={(e) => setGoalForm({...goalForm, employeeId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required>
              <option value="">Select Employee</option>
              {employees.map(e => <option key={e._id} value={e.employeeId}>{e.fullName}</option>)}
            </select>
          </div>
          <Input label="Title *" value={goalForm.title} onChange={(e) => setGoalForm({...goalForm, title: e.target.value})} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea value={goalForm.description} onChange={(e) => setGoalForm({...goalForm, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select value={goalForm.type} onChange={(e) => setGoalForm({...goalForm, type: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                {['KPI', 'OKR', 'Project', 'Skill Development', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select value={goalForm.category} onChange={(e) => setGoalForm({...goalForm, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                {['Individual', 'Team', 'Organizational'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Target Value" value={goalForm.targetValue} onChange={(e) => setGoalForm({...goalForm, targetValue: e.target.value})} />
            <Input label="Current Value" value={goalForm.currentValue} onChange={(e) => setGoalForm({...goalForm, currentValue: e.target.value})} />
            <Input label="Unit" value={goalForm.unit} onChange={(e) => setGoalForm({...goalForm, unit: e.target.value})} placeholder="%, units" />
          </div>
          <Input label="Weightage (%)" type="number" min="0" max="100" value={goalForm.weightage} onChange={(e) => setGoalForm({...goalForm, weightage: parseInt(e.target.value) || 0})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date *" type="date" value={goalForm.startDate} onChange={(e) => setGoalForm({...goalForm, startDate: e.target.value})} required />
            <Input label="End Date *" type="date" value={goalForm.endDate} onChange={(e) => setGoalForm({...goalForm, endDate: e.target.value})} required />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowGoalModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Create Review Modal */}
      <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} title="Create Performance Review">
        <form onSubmit={handleCreateReview} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee *</label>
            <select value={reviewForm.employeeId} onChange={(e) => setReviewForm({...reviewForm, employeeId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required>
              <option value="">Select Employee</option>
              {employees.map(e => <option key={e._id} value={e.employeeId}>{e.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Review Type *</label>
            <select value={reviewForm.reviewType} onChange={(e) => setReviewForm({...reviewForm, reviewType: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {['Quarterly', 'Half-Yearly', 'Annual', 'Probation'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Period Start *" type="date" value={reviewForm.reviewPeriod.startDate} onChange={(e) => setReviewForm({...reviewForm, reviewPeriod: {...reviewForm.reviewPeriod, startDate: e.target.value}})} required />
            <Input label="Period End *" type="date" value={reviewForm.reviewPeriod.endDate} onChange={(e) => setReviewForm({...reviewForm, reviewPeriod: {...reviewForm.reviewPeriod, endDate: e.target.value}})} required />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowReviewModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Review Detail Modal */}
      <Modal isOpen={showReviewDetailModal} onClose={() => setShowReviewDetailModal(false)} title="Performance Review Details">
        {selectedReview && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">{selectedReview.employeeName}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Type:</span> {selectedReview.reviewType}</div>
                <div><span className="text-gray-500">Period:</span> {formatDate(selectedReview.reviewPeriod.startDate)} - {formatDate(selectedReview.reviewPeriod.endDate)}</div>
                <div><span className="text-gray-500">Status:</span> <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[selectedReview.status]}`}>{selectedReview.status}</span></div>
                <div><span className="text-gray-500">Rating:</span> {selectedReview.overallRating}/5 ★</div>
              </div>
            </div>

            {selectedReview.status === 'Pending Self Review' && (
              <div>
                <h4 className="font-semibold mb-3">Self Review</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Achievements</label>
                    <textarea value={selfReviewForm.achievements} onChange={(e) => setSelfReviewForm({...selfReviewForm, achievements: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={2} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Challenges</label>
                    <textarea value={selfReviewForm.challenges} onChange={(e) => setSelfReviewForm({...selfReviewForm, challenges: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={2} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Areas of Improvement</label>
                    <textarea value={selfReviewForm.areasOfImprovement} onChange={(e) => setSelfReviewForm({...selfReviewForm, areasOfImprovement: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={2} />
                  </div>
                  <Button onClick={handleSubmitSelfReview} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Self Review'}</Button>
                </div>
              </div>
            )}

            {selectedReview.status === 'Pending Manager Review' && (
              <div>
                <h4 className="font-semibold mb-3">Manager Review</h4>
                <div className="space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                    <h5 className="font-medium mb-2">Employee's Self Review</h5>
                    <div className="text-sm space-y-1">
                      <p><strong>Achievements:</strong> {selectedReview.selfReview?.achievements}</p>
                      <p><strong>Challenges:</strong> {selectedReview.selfReview?.challenges}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Strengths</label>
                    <textarea value={managerReviewForm.managerReview.strengths} onChange={(e) => setManagerReviewForm({...managerReviewForm, managerReview: {...managerReviewForm.managerReview, strengths: e.target.value}})} className="w-full px-3 py-2 border rounded-lg" rows={2} />
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">Ratings (1-5 stars)</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.keys(managerReviewForm.ratings).map(key => (
                        <div key={key}>
                          <label className="block text-sm mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                          <StarRating rating={managerReviewForm.ratings[key]} onChange={(val) => setManagerReviewForm({...managerReviewForm, ratings: {...managerReviewForm.ratings, [key]: val}})} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="promo" checked={managerReviewForm.recommendedForPromotion} onChange={(e) => setManagerReviewForm({...managerReviewForm, recommendedForPromotion: e.target.checked})} />
                    <label htmlFor="promo" className="text-sm">Recommend for Promotion</label>
                  </div>
                  <Button onClick={handleSubmitManagerReview} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Manager Review'}</Button>
                </div>
              </div>
            )}

            {selectedReview.status === 'Completed' && (
              <div>
                <div className="space-y-3">
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                    <h5 className="font-medium mb-2">Overall Performance</h5>
                    <div className="flex items-center gap-4">
                      <div><StarRating rating={selectedReview.overallRating} readonly /></div>
                      <div><span className={`px-3 py-1 text-sm rounded-full ${BAND_COLORS[selectedReview.performanceBand]}`}>{selectedReview.performanceBand}</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedReview.ratings).map(([key, val]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <StarRating rating={val} readonly />
                      </div>
                    ))}
                  </div>
                  {!selectedReview.employeeAcknowledged && (
                    <Button onClick={handleAcknowledgeReview}>Acknowledge Review</Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Promotion Modal */}
      <Modal isOpen={showPromotionModal} onClose={() => setShowPromotionModal(false)} title="Create Promotion/Increment">
        <form onSubmit={handleCreatePromotion} className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={fillPromotionSampleData} className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Fill with Sample Data
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee *</label>
            <select value={promotionForm.employeeId} onChange={(e) => setPromotionForm({...promotionForm, employeeId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required>
              <option value="">Select Employee</option>
              {employees.map(e => <option key={e._id} value={e.employeeId}>{e.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select value={promotionForm.type} onChange={(e) => setPromotionForm({...promotionForm, type: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {['Promotion', 'Increment', 'Designation Change', 'Grade Change'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Previous Designation" value={promotionForm.previousDesignation} onChange={(e) => setPromotionForm({...promotionForm, previousDesignation: e.target.value})} />
            <Input label="New Designation" value={promotionForm.newDesignation} onChange={(e) => setPromotionForm({...promotionForm, newDesignation: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Previous Salary" type="number" value={promotionForm.previousSalary} onChange={(e) => setPromotionForm({...promotionForm, previousSalary: e.target.value})} />
            <Input label="New Salary" type="number" value={promotionForm.newSalary} onChange={(e) => {
              const newSal = parseFloat(e.target.value) || 0;
              const prevSal = parseFloat(promotionForm.previousSalary) || 0;
              const incPct = prevSal > 0 ? ((newSal - prevSal) / prevSal * 100).toFixed(2) : 0;
              setPromotionForm({...promotionForm, newSalary: e.target.value, incrementPercentage: parseFloat(incPct), incrementAmount: newSal - prevSal});
            }} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Increment %" type="number" value={promotionForm.incrementPercentage} readOnly />
            <Input label="Increment Amount" type="number" value={promotionForm.incrementAmount} readOnly />
          </div>
          <Input label="Effective Date *" type="date" value={promotionForm.effectiveDate} onChange={(e) => setPromotionForm({...promotionForm, effectiveDate: e.target.value})} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
            <textarea value={promotionForm.reason} onChange={(e) => setPromotionForm({...promotionForm, reason: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={2} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowPromotionModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Performance;
