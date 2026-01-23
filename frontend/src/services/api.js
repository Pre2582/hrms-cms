import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Employee APIs
export const employeeAPI = {
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

// Attendance APIs
export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  getByEmployee: (employeeId) => api.get(`/attendance/employee/${employeeId}`),
  mark: (data) => api.post('/attendance', data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  delete: (id) => api.delete(`/attendance/${id}`),
  getCalendarData: (params) => api.get('/attendance/calendar', { params }),
  getStats: () => api.get('/attendance/stats'),
  punchIn: (employeeId) => api.post('/attendance/punch-in', { employeeId }),
  punchOut: (employeeId) => api.post('/attendance/punch-out', { employeeId }),
  getPunchStatus: (employeeId) => api.get(`/attendance/punch-status/${employeeId}`),
  requestCorrection: (data) => api.post('/attendance/correction', data),
  getPendingCorrections: () => api.get('/attendance/corrections/pending'),
  processCorrection: (id, data) => api.put(`/attendance/corrections/${id}/process`, data),
};

// Leave APIs
export const leaveAPI = {
  // Stats
  getStats: () => api.get('/leave/stats'),
  // Leave types
  getLeaveTypes: () => api.get('/leave/types'),
  createLeaveType: (data) => api.post('/leave/types', data),
  updateLeaveType: (id, data) => api.put(`/leave/types/${id}`, data),
  initializeLeaveTypes: () => api.post('/leave/types/initialize'),
  // Leave balances
  getAllBalances: (year) => api.get('/leave/balances', { params: { year } }),
  getBalance: (employeeId, year) => api.get(`/leave/balances/${employeeId}`, { params: { year } }),
  initializeBalances: (year) => api.post('/leave/balances/initialize', { year }),
  // Leave requests
  getRequests: (params) => api.get('/leave/requests', { params }),
  applyLeave: (data) => api.post('/leave/requests', data),
  processRequest: (id, data) => api.put(`/leave/requests/${id}/process`, data),
  cancelRequest: (id) => api.put(`/leave/requests/${id}/cancel`),
  // Holidays
  getHolidays: (year) => api.get('/leave/holidays', { params: { year } }),
  createHoliday: (data) => api.post('/leave/holidays', data),
  updateHoliday: (id, data) => api.put(`/leave/holidays/${id}`, data),
  deleteHoliday: (id) => api.delete(`/leave/holidays/${id}`),
  initializeHolidays: (year) => api.post('/leave/holidays/initialize', { year }),
};

// Payroll APIs
export const payrollAPI = {
  // Stats
  getStats: (month, year) => api.get('/payroll/stats', { params: { month, year } }),
  // Salary structures
  getAllSalaryStructures: () => api.get('/payroll/salary-structures'),
  getSalaryStructure: (employeeId) => api.get(`/payroll/salary-structures/${employeeId}`),
  saveSalaryStructure: (data) => api.post('/payroll/salary-structures', data),
  // Payroll
  getPayroll: (params) => api.get('/payroll', { params }),
  processPayroll: (data) => api.post('/payroll/process', data),
  lockPayroll: (month, year) => api.post('/payroll/lock', { month, year }),
  approvePayroll: (id, data) => api.put(`/payroll/${id}/approve`, data),
  // Payslip
  getPayslip: (employeeId, month, year) => api.get(`/payroll/payslip/${employeeId}/${month}/${year}`),
  // Bonuses
  getBonuses: (params) => api.get('/payroll/bonuses', { params }),
  createBonus: (data) => api.post('/payroll/bonuses', data),
  approveBonus: (id, data) => api.put(`/payroll/bonuses/${id}/approve`, data),
  // Config
  getConfig: () => api.get('/payroll/config'),
  updateConfig: (data) => api.put('/payroll/config', data),
};

// Performance APIs
export const performanceAPI = {
  // Stats
  getStats: () => api.get('/performance/stats'),
  // Goals
  getGoals: (params) => api.get('/performance/goals', { params }),
  createGoal: (data) => api.post('/performance/goals', data),
  updateGoal: (id, data) => api.put(`/performance/goals/${id}`, data),
  deleteGoal: (id) => api.delete(`/performance/goals/${id}`),
  updateGoalProgress: (id, data) => api.put(`/performance/goals/${id}/progress`, data),
  // Reviews
  getReviews: (params) => api.get('/performance/reviews', { params }),
  getReviewById: (id) => api.get(`/performance/reviews/${id}`),
  createReview: (data) => api.post('/performance/reviews', data),
  submitSelfReview: (id, data) => api.put(`/performance/reviews/${id}/self-review`, data),
  submitManagerReview: (id, data) => api.put(`/performance/reviews/${id}/manager-review`, data),
  acknowledgeReview: (id, data) => api.put(`/performance/reviews/${id}/acknowledge`, data),
  // Promotions
  getPromotions: (params) => api.get('/performance/promotions', { params }),
  createPromotion: (data) => api.post('/performance/promotions', data),
  approvePromotion: (id, data) => api.put(`/performance/promotions/${id}/approve`, data),
  implementPromotion: (id) => api.put(`/performance/promotions/${id}/implement`),
  // History
  getEmployeeHistory: (employeeId) => api.get(`/performance/history/${employeeId}`),
};

// Document APIs
export const documentAPI = {
  // Stats
  getStats: () => api.get('/documents/stats'),
  // Initialize
  initializeSampleDocuments: () => api.post('/documents/initialize'),
  // Documents
  getDocuments: (params) => api.get('/documents', { params }),
  getDocumentById: (id) => api.get(`/documents/${id}`),
  createDocument: (data) => api.post('/documents', data),
  updateDocument: (id, data) => api.put(`/documents/${id}`, data),
  deleteDocument: (id) => api.delete(`/documents/${id}`),
  // Download
  trackDownload: (id, data) => api.post(`/documents/${id}/download`, data),
  // Acknowledgment
  acknowledgeDocument: (id, data) => api.post(`/documents/${id}/acknowledge`, data),
  // Category & Employee
  getDocumentsByCategory: (category) => api.get(`/documents/category/${category}`),
  getEmployeeDocuments: (employeeId) => api.get(`/documents/employee/${employeeId}`),
  // Search
  searchDocuments: (query) => api.get('/documents/search', { params: { query } }),
};

export default api;

