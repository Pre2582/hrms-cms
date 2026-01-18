import { useState, useEffect } from 'react';
import { attendanceAPI, employeeAPI } from '../services/api';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { toast } from 'react-toastify';

const Attendance = () => {
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
    return <LoadingSpinner size="lg" text="Loading attendance records..." />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
        <Button onClick={openMarkModal} disabled={employees.length === 0}>
          + Mark Attendance
        </Button>
      </div>

      {employees.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            No employees found. Please add employees first before marking attendance.
          </p>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Employee
            </label>
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp.employeeId}>
                  {emp.fullName} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Date
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={clearFilters}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <ErrorMessage message={error} onRetry={fetchAttendance} />
      )}

      {!error && attendance.length === 0 && (
        <EmptyState
          title="No attendance records found"
          description={
            filterDate || filterEmployeeId
              ? "No records match your filters. Try adjusting your search criteria."
              : "Start by marking attendance for your employees."
          }
          icon="📋"
          action={
            employees.length > 0 && (
              <Button onClick={openMarkModal}>Mark Attendance</Button>
            )
          }
        />
      )}

      {!error && attendance.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendance.map((record) => (
                <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.employeeId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getEmployeeName(record.employeeId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(record.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.status === 'Present'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {record.status}
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
        title="Mark Attendance"
      >
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {formError}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee <span className="text-red-500">*</span>
            </label>
            <select
              name="employeeId"
              value={formData.employeeId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp.employeeId}>
                  {emp.fullName} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            required
          />

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Mark Attendance'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Attendance;
