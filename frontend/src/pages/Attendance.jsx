import { useState, useEffect } from 'react';
import { attendanceAPI, employeeAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { toast } from 'react-toastify';

const Attendance = () => {
  const { t } = useSettings();
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Present'
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [filterDate, filterEmployeeId]);

  const fetchInitialData = async () => {
    await Promise.all([fetchEmployees(), fetchAttendance()]);
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getAll();
      setEmployees(response.data.data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchAttendance = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.date || !formData.status) {
      setFormError('All fields are required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      const response = await attendanceAPI.mark(formData);
      setShowModal(false);
      setFormData({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Present'
      });
      fetchAttendance();
      const employee = employees.find(emp => emp.employeeId === formData.employeeId);
      toast.success(`Attendance marked as ${formData.status} for ${employee?.fullName || formData.employeeId}`);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to mark attendance';
      setFormError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const openMarkModal = () => {
    setFormData({
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      status: 'Present'
    });
    setFormError('');
    setShowModal(true);
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.employeeId === employeeId);
    return employee ? employee.fullName : employeeId;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const clearFilters = () => {
    setFilterDate('');
    setFilterEmployeeId('');
  };

  if (loading && employees.length === 0) {
    return <LoadingSpinner size="lg" text={t('loading')} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('attendanceManagement')}</h1>
        <Button onClick={openMarkModal} disabled={employees.length === 0}>
          + {t('markAttendance')}
        </Button>
      </div>

      {employees.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 dark:text-yellow-300">
            {t('noEmployeesFound')}. {t('getStartedByAdding')}
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('filters')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('filterByEmployee')}
            </label>
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{t('allEmployees')}</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp.employeeId}>
                  {emp.fullName} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('filterByDate')}
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={clearFilters}
              className="w-full"
            >
              {t('clearFilters')}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <ErrorMessage message={error} onRetry={fetchAttendance} />
      )}

      {!error && attendance.length === 0 && (
        <EmptyState
          title={t('noAttendanceRecords')}
          description={
            filterDate || filterEmployeeId
              ? t('noAttendanceRecords')
              : t('noAttendanceData')
          }
          icon="📋"
          action={
            employees.length > 0 && (
              <Button onClick={openMarkModal}>{t('markAttendance')}</Button>
            )
          }
        />
      )}

      {!error && attendance.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('employeeId')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('employeeName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('status')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {attendance.map((record) => (
                <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {record.employeeId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {getEmployeeName(record.employeeId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(record.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.status === 'Present'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}
                    >
                      {t(record.status.toLowerCase())}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t('markAttendance')}
      >
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {formError}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('employee')} <span className="text-red-500">*</span>
            </label>
            <select
              name="employeeId"
              value={formData.employeeId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">{t('selectEmployee')}</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp.employeeId}>
                  {emp.fullName} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          <Input
            label={t('date')}
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            required
          />

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('status')} <span className="text-red-500">*</span>
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="Present">{t('present')}</option>
              <option value="Absent">{t('absent')}</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
              disabled={submitting}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
            >
              {submitting ? t('loading') : t('markAttendance')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Attendance;
