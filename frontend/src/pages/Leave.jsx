import { useState, useEffect, useCallback } from 'react';
import { leaveAPI, employeeAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { toast } from 'react-toastify';

const STATUS_COLORS = {
  Pending: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  Approved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  Rejected: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  Cancelled: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
};

const LEAVE_TYPE_COLORS = {
  Casual: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  Sick: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  Earned: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  LOP: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
};

const Leave = () => {
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [stats, setStats] = useState({});
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const currentYear = new Date().getFullYear();

  const [leaveForm, setLeaveForm] = useState({
    employeeId: '', leaveType: 'Casual', startDate: '', endDate: '', isHalfDay: false, halfDayType: '', reason: ''
  });
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', type: 'Company', description: '' });
  const [processForm, setProcessForm] = useState({ action: 'approve', rejectionReason: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, typesRes, reqRes, balRes, holRes, statsRes] = await Promise.all([
        employeeAPI.getAll(),
        leaveAPI.getLeaveTypes(),
        leaveAPI.getRequests({ status: filterStatus || undefined, employeeId: filterEmployee || undefined }),
        leaveAPI.getAllBalances(currentYear),
        leaveAPI.getHolidays(currentYear),
        leaveAPI.getStats()
      ]);
      setEmployees(empRes.data.data || []);
      setLeaveTypes(typesRes.data.data || []);
      setLeaveRequests(reqRes.data.data || []);
      setLeaveBalances(balRes.data.data || []);
      setHolidays(holRes.data.data || []);
      setStats(statsRes.data.data || {});
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterEmployee, currentYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const initializeData = async () => {
    try {
      await Promise.all([
        leaveAPI.initializeLeaveTypes(),
        leaveAPI.initializeBalances(currentYear),
        leaveAPI.initializeHolidays(currentYear)
      ]);
      toast.success('Leave data initialized successfully');
      fetchData();
    } catch (err) {
      toast.error('Failed to initialize data');
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      setSubmitting(true);
      await leaveAPI.applyLeave(leaveForm);
      toast.success('Leave request submitted');
      setShowApplyModal(false);
      setLeaveForm({ employeeId: '', leaveType: 'Casual', startDate: '', endDate: '', isHalfDay: false, halfDayType: '', reason: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply leave');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest) return;
    try {
      setSubmitting(true);
      await leaveAPI.processRequest(selectedRequest._id, {
        action: processForm.action,
        rejectionReason: processForm.rejectionReason,
        approvedBy: 'HR Admin'
      });
      toast.success(`Leave request ${processForm.action}d`);
      setShowProcessModal(false);
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      await leaveAPI.cancelRequest(id);
      toast.success('Leave request cancelled');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await leaveAPI.createHoliday(holidayForm);
      toast.success('Holiday created');
      setShowHolidayModal(false);
      setHolidayForm({ name: '', date: '', type: 'Company', description: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create holiday');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Delete this holiday?')) return;
    try {
      await leaveAPI.deleteHoliday(id);
      toast.success('Holiday deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete holiday');
    }
  };

  const fillLeaveSampleData = () => {
    const leaveReasons = {
      Casual: [
        'Personal work',
        'Family function',
        'Home renovation work',
        'Attending wedding ceremony',
        'Personal commitment'
      ],
      Sick: [
        'Fever and cold',
        'Medical checkup',
        'Viral infection',
        'Doctor appointment',
        'Health issues'
      ],
      Earned: [
        'Vacation with family',
        'Long pending vacation',
        'Annual leave',
        'Extended weekend trip',
        'Personal vacation'
      ],
      LOP: [
        'Extended leave without pay',
        'Personal emergency',
        'Additional leave required',
        'Exhausted leave balance'
      ]
    };

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + Math.floor(Math.random() * 30) + 1); // 1-30 days from now
    
    const daysCount = Math.floor(Math.random() * 5) + 1; // 1-5 days
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + daysCount - 1);

    const selectedLeaveType = leaveTypes.length > 0 
      ? leaveTypes[Math.floor(Math.random() * leaveTypes.length)].name 
      : 'Casual';
    
    const reasons = leaveReasons[selectedLeaveType] || leaveReasons.Casual;
    
    setLeaveForm({
      employeeId: employees.length > 0 ? employees[Math.floor(Math.random() * employees.length)].employeeId : '',
      leaveType: selectedLeaveType,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      isHalfDay: Math.random() > 0.7, // 30% chance of half day
      halfDayType: Math.random() > 0.5 ? 'First Half' : 'Second Half',
      reason: reasons[Math.floor(Math.random() * reasons.length)]
    });
    toast.success('Sample leave data filled!');
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Leave Management</h1>
        <SkeletonLoader type="table" rows={5} columns={4} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leave Management</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={initializeData}>Initialize Data</Button>
          <Button onClick={() => setShowApplyModal(true)}>+ Apply Leave</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingRequests || 0}</div>
          <div className="text-sm text-yellow-700 dark:text-yellow-300">Pending Requests</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.approvedThisMonth || 0}</div>
          <div className="text-sm text-green-700 dark:text-green-300">Approved This Month</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{holidays.length}</div>
          <div className="text-sm text-blue-700 dark:text-blue-300">Holidays This Year</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{leaveTypes.length}</div>
          <div className="text-sm text-purple-700 dark:text-purple-300">Leave Types</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {['requests', 'balances', 'holidays'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${activeTab === tab 
              ? 'text-primary-600 border-b-2 border-primary-600' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            {tab === 'requests' ? 'Leave Requests' : tab === 'balances' ? 'Leave Balances' : 'Holiday Calendar'}
          </button>
        ))}
      </div>

      {/* Leave Requests Tab */}
      {activeTab === 'requests' && (
        <div>
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="">All Status</option>
                {['Pending', 'Approved', 'Rejected', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="">All Employees</option>
                {employees.map(e => <option key={e._id} value={e.employeeId}>{e.fullName}</option>)}
              </select>
              <Button variant="secondary" onClick={() => { setFilterStatus(''); setFilterEmployee(''); }}>Clear</Button>
            </div>
          </div>

          {leaveRequests.length === 0 ? (
            <EmptyState title="No leave requests" description="No leave requests found" icon="📅" />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {['Employee', 'Type', 'Dates', 'Days', 'Reason', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {leaveRequests.map(req => (
                      <tr key={req._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{req.employeeName}</td>
                        <td className="px-4 py-4"><span className={`px-2 py-1 text-xs rounded-full ${LEAVE_TYPE_COLORS[req.leaveType] || 'bg-gray-100'}`}>{req.leaveType}</span></td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(req.startDate)} - {formatDate(req.endDate)}</td>
                        <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{req.numberOfDays}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{req.reason}</td>
                        <td className="px-4 py-4"><span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[req.status]}`}>{req.status}</span></td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            {req.status === 'Pending' && (
                              <>
                                <button onClick={() => { setSelectedRequest(req); setProcessForm({ action: 'approve', rejectionReason: '' }); setShowProcessModal(true); }}
                                  className="text-xs text-green-600 hover:underline">Approve</button>
                                <button onClick={() => { setSelectedRequest(req); setProcessForm({ action: 'reject', rejectionReason: '' }); setShowProcessModal(true); }}
                                  className="text-xs text-red-600 hover:underline">Reject</button>
                              </>
                            )}
                            {['Pending', 'Approved'].includes(req.status) && (
                              <button onClick={() => handleCancelRequest(req._id)} className="text-xs text-gray-600 hover:underline">Cancel</button>
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

      {/* Leave Balances Tab */}
      {activeTab === 'balances' && (
        <div className="grid gap-4">
          {leaveBalances.length === 0 ? (
            <EmptyState title="No balances" description="Initialize leave balances first" icon="📊" />
          ) : (
            leaveBalances.map(bal => (
              <div key={bal._id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{bal.employeeName} ({bal.employeeId})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {bal.balances.map(b => (
                    <div key={b.leaveType} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{b.leaveType}</div>
                      <div className="flex justify-between mt-1">
                        <span className="text-lg font-bold text-green-600">{b.available}</span>
                        <span className="text-sm text-gray-500">/ {b.allocated}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Used: {b.used} | Pending: {b.pending}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Holidays Tab */}
      {activeTab === 'holidays' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowHolidayModal(true)}>+ Add Holiday</Button>
          </div>
          {holidays.length === 0 ? (
            <EmptyState title="No holidays" description="Add holidays to the calendar" icon="🎉" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {holidays.map(h => (
                <div key={h._id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{h.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(h.date)}</p>
                    <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">{h.type}</span>
                  </div>
                  <button onClick={() => handleDeleteHoliday(h._id)} className="text-red-500 hover:text-red-700">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apply Leave Modal */}
      <Modal isOpen={showApplyModal} onClose={() => setShowApplyModal(false)} title="Apply for Leave">
        <form onSubmit={handleApplyLeave} className="space-y-4">
          {/* Fill Sample Data Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={fillLeaveSampleData}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Fill with Sample Data
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee *</label>
            <select value={leaveForm.employeeId} onChange={(e) => setLeaveForm({...leaveForm, employeeId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required>
              <option value="">Select Employee</option>
              {employees.map(e => <option key={e._id} value={e.employeeId}>{e.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type *</label>
            <select value={leaveForm.leaveType} onChange={(e) => setLeaveForm({...leaveForm, leaveType: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {leaveTypes.map(lt => <option key={lt._id} value={lt.name}>{lt.name} ({lt.code})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date *" type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value})} required />
            <Input label="End Date *" type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value})} required />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="halfDay" checked={leaveForm.isHalfDay} onChange={(e) => setLeaveForm({...leaveForm, isHalfDay: e.target.checked})} />
            <label htmlFor="halfDay" className="text-sm text-gray-700 dark:text-gray-300">Half Day</label>
            {leaveForm.isHalfDay && (
              <select value={leaveForm.halfDayType} onChange={(e) => setLeaveForm({...leaveForm, halfDayType: e.target.value})} className="ml-4 px-2 py-1 border rounded text-sm">
                <option value="First Half">First Half</option>
                <option value="Second Half">Second Half</option>
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason *</label>
            <textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={3} required />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowApplyModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</Button>
          </div>
        </form>
      </Modal>

      {/* Process Leave Modal */}
      <Modal isOpen={showProcessModal} onClose={() => setShowProcessModal(false)} title="Process Leave Request">
        {selectedRequest && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p><strong>Employee:</strong> {selectedRequest.employeeName}</p>
              <p><strong>Type:</strong> {selectedRequest.leaveType}</p>
              <p><strong>Dates:</strong> {formatDate(selectedRequest.startDate)} - {formatDate(selectedRequest.endDate)}</p>
              <p><strong>Days:</strong> {selectedRequest.numberOfDays}</p>
              <p><strong>Reason:</strong> {selectedRequest.reason}</p>
            </div>
            {processForm.action === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rejection Reason</label>
                <textarea value={processForm.rejectionReason} onChange={(e) => setProcessForm({...processForm, rejectionReason: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={2} />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowProcessModal(false)}>Cancel</Button>
              <button onClick={handleProcessRequest} disabled={submitting}
                className={`px-4 py-2 rounded-lg text-white ${processForm.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {submitting ? 'Processing...' : processForm.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Holiday Modal */}
      <Modal isOpen={showHolidayModal} onClose={() => setShowHolidayModal(false)} title="Add Holiday">
        <form onSubmit={handleCreateHoliday} className="space-y-4">
          <Input label="Holiday Name *" value={holidayForm.name} onChange={(e) => setHolidayForm({...holidayForm, name: e.target.value})} required />
          <Input label="Date *" type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({...holidayForm, date: e.target.value})} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select value={holidayForm.type} onChange={(e) => setHolidayForm({...holidayForm, type: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {['National', 'Regional', 'Company', 'Optional'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Input label="Description" value={holidayForm.description} onChange={(e) => setHolidayForm({...holidayForm, description: e.target.value})} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowHolidayModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Leave;
