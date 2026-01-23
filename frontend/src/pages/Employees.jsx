import { useState, useEffect } from "react";
import { employeeAPI } from "../services/api";
import { useSettings } from "../context/SettingsContext";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Input from "../components/Input";
import SkeletonLoader from "../components/SkeletonLoader";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import { toast } from "react-toastify";

const Employees = () => {
  const { t } = useSettings();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: "",
    fullName: "",
    email: "",
    department: "",
    mobile: "",
    dob: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    employeeId: "",
    fullName: "",
    email: "",
    department: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const clearFilters = () => {
    setFilters({
      employeeId: "",
      fullName: "",
      email: "",
      department: "",
    });
  };

  const filteredEmployees = employees.filter((employee) => {
    const matchesId = employee.employeeId
      .toLowerCase()
      .includes(filters.employeeId.toLowerCase());
    const matchesName = employee.fullName
      .toLowerCase()
      .includes(filters.fullName.toLowerCase());
    const matchesEmail = employee.email
      .toLowerCase()
      .includes(filters.email.toLowerCase());
    const matchesDepartment = employee.department
      .toLowerCase()
      .includes(filters.department.toLowerCase());
    return matchesId && matchesName && matchesEmail && matchesDepartment;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await employeeAPI.getAll();
      setEmployees(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.employeeId ||
      !formData.fullName ||
      !formData.email ||
      !formData.department ||
      !formData.mobile ||
      !formData.dob
    ) {
      setFormError("All fields are required");
      return;
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError("Please enter a valid email address");
      return;
    }

    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(formData.mobile)) {
      setFormError("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");

      if (editingEmployee) {
        // Update existing employee
        await employeeAPI.update(editingEmployee._id, formData);
        toast.success(`Employee ${formData.fullName} updated successfully!`);
      } else {
        // Create new employee
        await employeeAPI.create(formData);
        toast.success(`Employee ${formData.fullName} created successfully!`);
      }

      setShowModal(false);
      setFormData({ employeeId: "", fullName: "", email: "", department: "", mobile: "", dob: "" });
      setEditingEmployee(null);
      fetchEmployees();
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || (editingEmployee ? "Failed to update employee" : "Failed to create employee");
      setFormError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${name}? This will also delete all attendance records.`,
      )
    ) {
      return;
    }

    try {
      await employeeAPI.delete(id);
      fetchEmployees();
      toast.success(`Employee ${name} deleted successfully!`);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to delete employee";
      toast.error(errorMsg);
    }
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({ employeeId: "", fullName: "", email: "", department: "", mobile: "", dob: "" });
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      email: employee.email,
      department: employee.department,
      mobile: employee.mobile || "",
      dob: employee.dob ? new Date(employee.dob).toISOString().split('T')[0] : "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleViewDetails = async (id) => {
    try {
      setLoadingDetail(true);
      setShowDetailModal(true);
      const response = await employeeAPI.getById(id);
      setSelectedEmployee(response.data.data);
    } catch (err) {
      toast.error("Failed to fetch employee details");
      setShowDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };
  const firstNames = ["John", "Amit", "Rahul", "Priya", "Neha", "Ankit"];
  const lastNames = ["Doe", "Sharma", "Verma", "Singh", "Patel", "Gupta"];
  const departments = ["Engineering", "HR", "Finance", "Sales", "Marketing"];

  const generateRandomEmployee = () => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const department =
      departments[Math.floor(Math.random() * departments.length)];

    const randomNumber = Math.floor(100 + Math.random() * 900);

    // Generate random mobile number
    const mobile = `9${Math.floor(Math.random() * 900000000 + 100000000)}`;

    // Generate random date of birth (between 1970 and 2000)
    const year = Math.floor(Math.random() * 30) + 1970;
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const dob = `${year}-${month}-${day}`;

    return {
      employeeId: `EMP${randomNumber}`,
      fullName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNumber}@example.com`,
      department,
      mobile,
      dob,
    };
  };
  const handleFillMockData = () => {
    setFormData(generateRandomEmployee());
    setFormError("");
  };
  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('employeeManagement')}
          </h1>
        </div>
        <SkeletonLoader type="table" rows={5} columns={7} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('employeeManagement')}
        </h1>
        <Button onClick={openAddModal}>+ {t('addEmployee')}</Button>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchEmployees} />}

      {/* Filter Section */}
      {!error && employees.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('filters')}</h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                {t('clearFilters')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('employeeId')}
              </label>
              <input
                type="text"
                name="employeeId"
                value={filters.employeeId}
                onChange={handleFilterChange}
                placeholder={`${t('employeeId')}...`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('fullName')}
              </label>
              <input
                type="text"
                name="fullName"
                value={filters.fullName}
                onChange={handleFilterChange}
                placeholder={`${t('fullName')}...`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('email')}
              </label>
              <input
                type="text"
                name="email"
                value={filters.email}
                onChange={handleFilterChange}
                placeholder={`${t('email')}...`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('department')}
              </label>
              <input
                type="text"
                name="department"
                value={filters.department}
                onChange={handleFilterChange}
                placeholder={`${t('department')}...`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {filteredEmployees.length} / {employees.length}
            </div>
          )}
        </div>
      )}

      {!error && employees.length === 0 && (
        <EmptyState
          title={t('noEmployeesFound')}
          description={t('getStartedByAdding')}
          icon="👥"
          action={<Button onClick={openAddModal}>{t('addFirstEmployee')}</Button>}
        />
      )}

      {!error && employees.length > 0 && filteredEmployees.length === 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-gray-400 dark:text-gray-500 text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t('noEmployeesFound')}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t('getStartedByAdding')}</p>
          <button
            onClick={clearFilters}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            {t('clearFilters')}
          </button>
        </div>
      )}

      {!error && filteredEmployees.length > 0 && (
        <>
          {/* Mobile Card View (screens < 768px) */}
          <div className="md:hidden space-y-4">
            {currentEmployees.map((employee) => (
              <div
                key={employee._id}
                className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {employee.fullName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {employee.employeeId}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24">
                      Email:
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white break-all">
                      {employee.email}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24">
                      Department:
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {employee.department}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24">
                      Mobile:
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {employee.mobile || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24">
                      DOB:
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {employee.dob ? new Date(employee.dob).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleViewDetails(employee._id)}
                    className="text-sm flex-1"
                  >
                    View Details
                  </Button>
                  <Button
                    onClick={() => openEditModal(employee)}
                    className="text-sm flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(employee._id, employee.fullName)}
                    className="text-sm flex-1"
                  >
                    {t('delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Tablet & Desktop Table View (screens >= 768px) - Scrollable */}
          <div className="hidden md:block bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      {t('employeeId')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      {t('fullName')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      {t('email')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      {t('department')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Mobile
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      DOB
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {currentEmployees.map((employee) => (
                    <tr
                      key={employee._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {employee.employeeId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {employee.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {employee.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {employee.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {employee.mobile || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {employee.dob ? new Date(employee.dob).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => handleViewDetails(employee._id)}
                            className="text-sm"
                          >
                            View Details
                          </Button>
                          <Button
                            onClick={() => openEditModal(employee)}
                            className="text-sm"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() =>
                              handleDelete(employee._id, employee.fullName)
                            }
                            className="text-sm"
                          >
                            {t('delete')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-800 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700">
              {/* Results info */}
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(indexOfLastItem, filteredEmployees.length)}
                </span>{' '}
                of <span className="font-medium">{filteredEmployees.length}</span> employees
              </div>

              {/* Pagination buttons */}
              <div className="flex items-center gap-2">
                {/* Previous button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Previous
                </button>

                {/* Page numbers */}
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            currentPage === page
                              ? 'bg-primary-600 text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                {/* Mobile: Current page indicator */}
                <div className="sm:hidden px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md">
                  {currentPage} / {totalPages}
                </div>

                {/* Next button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEmployee(null);
        }}
        title={editingEmployee ? 'Edit Employee' : t('addNewEmployee')}
      >
        <form onSubmit={handleSubmit}>
          {/* Mock Data Button - Only show when adding new employee */}
          {process.env.NODE_ENV === "development" && !editingEmployee && (
            <div className="flex justify-end mb-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleFillMockData}
                disabled={submitting}
              >
                Fill Random Mock Data
              </Button>
            </div>
          )}
          {formError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {formError}
            </div>
          )}

          <Input
            label={t('employeeId')}
            name="employeeId"
            value={formData.employeeId}
            onChange={handleInputChange}
            placeholder="e.g., EMP001"
            required
          />

          <Input
            label={t('fullName')}
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="e.g., John Doe"
            required
          />

          <Input
            label={t('emailAddress')}
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="e.g., john@example.com"
            required
          />

          <Input
            label={t('department')}
            name="department"
            value={formData.department}
            onChange={handleInputChange}
            placeholder="e.g., Engineering"
            required
          />

          <Input
            label="Mobile Number"
            name="mobile"
            value={formData.mobile}
            onChange={handleInputChange}
            placeholder="e.g., 9876543210"
            required
          />

          <Input
            label="Date of Birth"
            type="date"
            name="dob"
            value={formData.dob}
            onChange={handleInputChange}
            required
          />

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingEmployee(null);
              }}
              disabled={submitting}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t('loading') : (editingEmployee ? 'Update Employee' : t('addEmployee'))}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Employee Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedEmployee(null);
        }}
        title="Employee Details"
      >
        {loadingDetail ? (
          <div className="flex justify-center py-8">
            <div className="h-12 w-12 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin"></div>
          </div>
        ) : selectedEmployee ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Employee ID
                </label>
                <p className="text-base text-gray-900 dark:text-white font-medium">
                  {selectedEmployee.employeeId}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Full Name
                </label>
                <p className="text-base text-gray-900 dark:text-white font-medium">
                  {selectedEmployee.fullName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Email
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {selectedEmployee.email}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Department
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {selectedEmployee.department}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Mobile Number
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {selectedEmployee.mobile || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Date of Birth
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {selectedEmployee.dob ? new Date(selectedEmployee.dob).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Created At
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {new Date(selectedEmployee.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Updated At
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {new Date(selectedEmployee.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedEmployee(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Employees;
