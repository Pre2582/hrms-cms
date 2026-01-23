import { useState, useEffect, useCallback } from 'react';
import { attendanceAPI, employeeAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { toast } from 'react-toastify';

const STATUS_COLORS = {
  Present: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  Absent: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  Late: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  Early: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
  'Half-Day': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
};

const APPROVAL_COLORS = {
  Pending: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  Approved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  Rejected: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  None: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
};

const Attendance = () => {
  const { t } = useSettings();
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [selectedCorrection, setSelectedCorrection] = useState(null);
  const [pendingCorrections, setPendingCorrections] = useState([]);
  const [viewMode, setViewMode] = useState('table');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [summary, setSummary] = useState({});
  const [punchStatus, setPunchStatus] = useState({});
  const [selectedEmployee, setSelectedEmployee] = useState('');
  
  const [formData, setFormData] = useState({
    employeeId: '', date: new Date().toISOString().split('T')[0], status: 'Present',
    punchIn: '', punchOut: '', remarks: ''
  });
  const [correctionForm, setCorrectionForm] = useState({
    employeeId: '', date: '', correctedPunchIn: '', correctedPunchOut: '', correctedStatus: '', reason: ''
  });
  const [approvalForm, setApprovalForm] = useState({ remarks: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await employeeAPI.getAll();
      setEmployees(response.data.data);
      if (response.data.data.length > 0 && !selectedEmployee) {
        setSelectedEmployee(response.data.data[0].employeeId);
      }
    } catch (err) { console.error('Failed to fetch employees:', err); }
  }, [selectedEmployee]);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filterDate) params.date = filterDate;
      if (filterEmployeeId) params.employeeId = filterEmployeeId;
      const response = await attendanceAPI.getAll(params);
      setAttendance(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch attendance records');
    } finally { setLoading(false); }
  }, [filterDate, filterEmployeeId]);

  const fetchCalendarData = useCallback(async () => {
    try {
      const params = {
        year: currentMonth.getFullYear(),
        month: currentMonth.getMonth() + 1,
        ...(filterEmployeeId && { employeeId: filterEmployeeId })
      };
      const response = await attendanceAPI.getCalendarData(params);
      setCalendarData(response.data.data.calendar || {});
      setSummary(response.data.data.summary || {});
    } catch (err) { console.error('Failed to fetch calendar data:', err); }
  }, [currentMonth, filterEmployeeId]);

  const fetchPunchStatus = useCallback(async () => {
    if (!selectedEmployee) return;
    try {
      const response = await attendanceAPI.getPunchStatus(selectedEmployee);
      setPunchStatus(response.data.data);
    } catch (err) { console.error('Failed to fetch punch status:', err); }
  }, [selectedEmployee]);

  const fetchPendingCorrections = useCallback(async () => {
    try {
      const response = await attendanceAPI.getPendingCorrections();
      setPendingCorrections(response.data.data);
    } catch (err) { console.error('Failed to fetch pending corrections:', err); }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);
  useEffect(() => { if (viewMode === 'calendar') fetchCalendarData(); }, [viewMode, fetchCalendarData]);
  useEffect(() => { fetchPunchStatus(); }, [fetchPunchStatus]);
  useEffect(() => { fetchPendingCorrections(); }, [fetchPendingCorrections]);
  useEffect(() => { setCurrentPage(1); }, [filterDate, filterEmployeeId]);

  const handlePunchIn = async () => {
    if (!selectedEmployee) { toast.error(t('selectEmployee')); return; }
    try {
      setSubmitting(true);
      await attendanceAPI.punchIn(selectedEmployee);
      toast.success(t('punchInSuccess'));
      fetchPunchStatus();
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to punch in');
    } finally { setSubmitting(false); }
  };

  const handlePunchOut = async () => {
    if (!selectedEmployee) { toast.error(t('selectEmployee')); return; }
    try {
      setSubmitting(true);
      await attendanceAPI.punchOut(selectedEmployee);
      toast.success(t('punchOutSuccess'));
      fetchPunchStatus();
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to punch out');
    } finally { setSubmitting(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.date || !formData.status) {
      setFormError('All fields are required'); return;
    }
    try {
      setSubmitting(true);
      if (editingAttendance) {
        await attendanceAPI.update(editingAttendance._id, formData);
        toast.success('Attendance updated successfully');
      } else {
        await attendanceAPI.mark(formData);
        toast.success(t('attendanceMarkedSuccess'));
      }
      setShowModal(false);
      setFormData({ employeeId: '', date: new Date().toISOString().split('T')[0], status: 'Present', punchIn: '', punchOut: '', remarks: '' });
      setEditingAttendance(null);
      fetchAttendance();
      fetchCalendarData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save attendance');
    } finally { setSubmitting(false); }
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!correctionForm.reason) { setFormError(t('correctionReason') + ' is required'); return; }
    try {
      setSubmitting(true);
      await attendanceAPI.requestCorrection(correctionForm);
      toast.success(t('correctionSubmitted'));
      setShowCorrectionModal(false);
      setCorrectionForm({ employeeId: '', date: '', correctedPunchIn: '', correctedPunchOut: '', correctedStatus: '', reason: '' });
      fetchAttendance();
      fetchPendingCorrections();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit correction');
    } finally { setSubmitting(false); }
  };

  const handleApproval = async (action) => {
    if (!selectedCorrection) return;
    try {
      setSubmitting(true);
      await attendanceAPI.processCorrection(selectedCorrection._id, { action, remarks: approvalForm.remarks, approvedBy: 'HR Admin' });
      toast.success(action === 'approve' ? t('correctionApproved') : t('correctionRejected'));
      setShowApprovalModal(false);
      setSelectedCorrection(null);
      setApprovalForm({ remarks: '' });
      fetchAttendance();
      fetchPendingCorrections();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process correction');
    } finally { setSubmitting(false); }
  };

  const openEditModal = (record) => {
    setEditingAttendance(record);
    setFormData({
      employeeId: record.employeeId,
      date: new Date(record.date).toISOString().split('T')[0],
      status: record.status,
      punchIn: record.punchIn ? new Date(record.punchIn).toTimeString().slice(0, 5) : '',
      punchOut: record.punchOut ? new Date(record.punchOut).toTimeString().slice(0, 5) : '',
      remarks: record.remarks || ''
    });
    setShowModal(true);
  };

  const openCorrectionModal = (record) => {
    setCorrectionForm({
      employeeId: record?.employeeId || selectedEmployee,
      date: record ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      correctedPunchIn: '', correctedPunchOut: '', correctedStatus: '', reason: ''
    });
    setShowCorrectionModal(true);
  };

  const handleDelete = async (id, employeeId) => {
    const employee = employees.find(emp => emp.employeeId === employeeId);
    if (!window.confirm(`Delete attendance record for ${employee?.fullName || employeeId}?`)) return;
    try {
      await attendanceAPI.delete(id);
      fetchAttendance();
      toast.success('Attendance record deleted');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const getEmployeeName = (employeeId) => employees.find(emp => emp.employeeId === employeeId)?.fullName || employeeId;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatTime = (dateString) => dateString ? new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    const dayNames = [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday')];

    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="p-2"></div>);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayRecords = calendarData[dateKey] || [];
      const isToday = new Date().toISOString().split('T')[0] === dateKey;
      
      days.push(
        <div key={day} className={`p-2 min-h-[80px] border border-gray-200 dark:border-gray-700 rounded-lg ${isToday ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500' : 'bg-white dark:bg-gray-800'}`}>
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>{day}</div>
          <div className="space-y-1">
            {dayRecords.slice(0, 3).map((record, idx) => (
              <div key={idx} className={`text-xs px-1 py-0.5 rounded truncate ${STATUS_COLORS[record.status]}`}>
                {filterEmployeeId ? record.status : getEmployeeName(record.employeeId).split(' ')[0]}
              </div>
            ))}
            {dayRecords.length > 3 && <div className="text-xs text-gray-500">+{dayRecords.length - 3} more</div>}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">←</button>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">→</button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
      </div>
    );
  };

  const totalPages = Math.ceil(attendance.length / itemsPerPage);
  const currentAttendance = attendance.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading && employees.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('attendanceManagement')}</h1>
        </div>
        <SkeletonLoader type="table" rows={5} columns={4} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('attendanceManagement')}</h1>
        <div className="flex gap-2">
          <Button variant={viewMode === 'table' ? 'primary' : 'secondary'} onClick={() => setViewMode('table')}>{t('tableView')}</Button>
          <Button variant={viewMode === 'calendar' ? 'primary' : 'secondary'} onClick={() => setViewMode('calendar')}>{t('calendarView')}</Button>
          <Button onClick={() => { setEditingAttendance(null); setFormData({ employeeId: '', date: new Date().toISOString().split('T')[0], status: 'Present', punchIn: '', punchOut: '', remarks: '' }); setShowModal(true); }} disabled={employees.length === 0}>+ {t('markAttendance')}</Button>
        </div>
      </div>

      {/* Punch In/Out Card */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 mb-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold mb-2">{t('todayStatus')}</h2>
            <div className="flex items-center gap-4">
              <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="px-3 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none">
                {employees.map(emp => <option key={emp._id} value={emp.employeeId} className="text-gray-900">{emp.fullName}</option>)}
              </select>
              {punchStatus.hasPunchedIn && <span className="text-sm opacity-90">{t('punchInTime')}: {formatTime(punchStatus.punchIn)}</span>}
              {punchStatus.hasPunchedOut && <span className="text-sm opacity-90">{t('punchOutTime')}: {formatTime(punchStatus.punchOut)}</span>}
              {punchStatus.workingHours > 0 && <span className="text-sm opacity-90">{punchStatus.workingHours.toFixed(2)} {t('hrs')}</span>}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handlePunchIn} disabled={submitting || punchStatus.hasPunchedIn} className={`px-6 py-3 rounded-lg font-semibold transition-all ${punchStatus.hasPunchedIn ? 'bg-white/30 cursor-not-allowed' : 'bg-white text-primary-600 hover:bg-white/90'}`}>
              {punchStatus.hasPunchedIn ? '✓ ' + t('punchedIn') : t('punchIn')}
            </button>
            <button onClick={handlePunchOut} disabled={submitting || !punchStatus.hasPunchedIn || punchStatus.hasPunchedOut} className={`px-6 py-3 rounded-lg font-semibold transition-all ${!punchStatus.hasPunchedIn || punchStatus.hasPunchedOut ? 'bg-white/30 cursor-not-allowed' : 'bg-white text-primary-600 hover:bg-white/90'}`}>
              {punchStatus.hasPunchedOut ? '✓ ' + t('punchedOut') : t('punchOut')}
            </button>
            <button onClick={() => openCorrectionModal(null)} className="px-4 py-3 rounded-lg bg-white/20 hover:bg-white/30 transition-all">{t('requestCorrection')}</button>
          </div>
        </div>
      </div>

      {/* Pending Corrections Alert */}
      {pendingCorrections.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">{t('pendingCorrections')}: {pendingCorrections.length}</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">Click to review and approve/reject correction requests</p>
            </div>
            <Button variant="secondary" onClick={() => { setSelectedCorrection(pendingCorrections[0]); setShowApprovalModal(true); }}>{t('viewDetails')}</Button>
          </div>
        </div>
      )}

      {/* Monthly Summary for Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          {[{ label: t('totalPresent'), value: summary.totalPresent || 0, color: 'green' },
            { label: t('totalAbsent'), value: summary.totalAbsent || 0, color: 'red' },
            { label: t('totalLate'), value: summary.totalLate || 0, color: 'yellow' },
            { label: t('totalEarly'), value: summary.totalEarly || 0, color: 'orange' },
            { label: t('totalHalfDay'), value: summary.totalHalfDay || 0, color: 'purple' },
            { label: t('pendingApprovals'), value: summary.pendingApprovals || 0, color: 'blue' }
          ].map((stat, idx) => (
            <div key={idx} className={`bg-${stat.color}-50 dark:bg-${stat.color}-900/20 rounded-lg p-4 border border-${stat.color}-200 dark:border-${stat.color}-800`}>
              <div className={`text-2xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.value}</div>
              <div className={`text-sm text-${stat.color}-700 dark:text-${stat.color}-300`}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('filterByEmployee')}</label>
            <select value={filterEmployeeId} onChange={(e) => setFilterEmployeeId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">{t('allEmployees')}</option>
              {employees.map(emp => <option key={emp._id} value={emp.employeeId}>{emp.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('filterByDate')}</label>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex items-end">
            <Button variant="secondary" onClick={() => { setFilterDate(''); setFilterEmployeeId(''); }} className="w-full">{t('clearFilters')}</Button>
          </div>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchAttendance} />}

      {/* Calendar or Table View */}
      {viewMode === 'calendar' ? renderCalendar() : (
        <>
          {!error && attendance.length === 0 ? (
            <EmptyState title={t('noAttendanceRecords')} description={t('noAttendanceData')} icon="📋" action={employees.length > 0 && <Button onClick={() => setShowModal(true)}>{t('markAttendance')}</Button>} />
          ) : (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {[t('employeeName'), t('date'), t('status'), t('punchInTime'), t('punchOutTime'), t('workingHours'), t('approvalStatus'), t('actions')].map(header => (
                        <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {currentAttendance.map(record => (
                      <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{getEmployeeName(record.employeeId)}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(record.date)}</td>
                        <td className="px-4 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[record.status]}`}>{record.status}</span></td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{formatTime(record.punchIn)}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{formatTime(record.punchOut)}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{record.workingHours ? `${record.workingHours.toFixed(2)} hrs` : '-'}</td>
                        <td className="px-4 py-4">{record.approvalStatus !== 'None' && <span className={`px-2 py-1 text-xs font-semibold rounded-full ${APPROVAL_COLORS[record.approvalStatus]}`}>{record.approvalStatus}</span>}</td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => openEditModal(record)} className="px-2 py-1 text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded">{t('edit')}</button>
                            <button onClick={() => openCorrectionModal(record)} className="px-2 py-1 text-xs text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded">{t('requestCorrection')}</button>
                            <button onClick={() => handleDelete(record._id, record.employeeId)} className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">{t('delete')}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Previous</button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Mark/Edit Attendance Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingAttendance ? t('editAttendance') : t('markAttendance')}>
        <form onSubmit={handleSubmit}>
          {formError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">{formError}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employee')} *</label>
              <select name="employeeId" value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required>
                <option value="">{t('selectEmployee')}</option>
                {employees.map(emp => <option key={emp._id} value={emp.employeeId}>{emp.fullName}</option>)}
              </select>
            </div>
            <Input label={t('date')} type="date" name="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('status')} *</label>
              <select name="status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required>
                {['Present', 'Absent', 'Late', 'Early', 'Half-Day'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label={t('punchInTime')} type="time" value={formData.punchIn} onChange={(e) => setFormData({ ...formData, punchIn: e.target.value })} />
              <Input label={t('punchOutTime')} type="time" value={formData.punchOut} onChange={(e) => setFormData({ ...formData, punchOut: e.target.value })} />
            </div>
            <Input label={t('remarks')} value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={submitting}>{submitting ? t('loading') : editingAttendance ? t('update') : t('markAttendance')}</Button>
          </div>
        </form>
      </Modal>

      {/* Correction Request Modal */}
      <Modal isOpen={showCorrectionModal} onClose={() => setShowCorrectionModal(false)} title={t('correctionRequest')}>
        <form onSubmit={handleCorrectionSubmit}>
          {formError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300 text-sm">{formError}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employee')} *</label>
              <select value={correctionForm.employeeId} onChange={(e) => setCorrectionForm({ ...correctionForm, employeeId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required>
                <option value="">{t('selectEmployee')}</option>
                {employees.map(emp => <option key={emp._id} value={emp.employeeId}>{emp.fullName}</option>)}
              </select>
            </div>
            <Input label={t('date')} type="date" value={correctionForm.date} onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label={t('correctedPunchIn')} type="datetime-local" value={correctionForm.correctedPunchIn} onChange={(e) => setCorrectionForm({ ...correctionForm, correctedPunchIn: e.target.value })} />
              <Input label={t('correctedPunchOut')} type="datetime-local" value={correctionForm.correctedPunchOut} onChange={(e) => setCorrectionForm({ ...correctionForm, correctedPunchOut: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('correctedStatus')}</label>
              <select value={correctionForm.correctedStatus} onChange={(e) => setCorrectionForm({ ...correctionForm, correctedStatus: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="">Auto-calculate</option>
                {['Present', 'Absent', 'Late', 'Early', 'Half-Day'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('correctionReason')} *</label>
              <textarea value={correctionForm.reason} onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={3} required />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setShowCorrectionModal(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={submitting}>{submitting ? t('loading') : t('submitCorrection')}</Button>
          </div>
        </form>
      </Modal>

      {/* Approval Modal */}
      <Modal isOpen={showApprovalModal} onClose={() => setShowApprovalModal(false)} title={t('processCorrection')}>
        {selectedCorrection && (
          <div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 space-y-2">
              <p><strong>{t('employee')}:</strong> {selectedCorrection.employeeName}</p>
              <p><strong>{t('date')}:</strong> {formatDate(selectedCorrection.date)}</p>
              <p><strong>{t('originalStatus')}:</strong> {selectedCorrection.originalStatus}</p>
              <p><strong>{t('correctedStatus')}:</strong> {selectedCorrection.status}</p>
              <p><strong>{t('correctionReason')}:</strong> {selectedCorrection.correctionReason}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('approvalRemarks')}</label>
              <textarea value={approvalForm.remarks} onChange={(e) => setApprovalForm({ remarks: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={2} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowApprovalModal(false)}>{t('cancel')}</Button>
              <button onClick={() => handleApproval('reject')} disabled={submitting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('reject')}</button>
              <button onClick={() => handleApproval('approve')} disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">{t('approve')}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Attendance;
