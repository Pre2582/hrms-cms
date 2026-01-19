import { useState, useEffect } from "react";
import { employeeAPI } from "../services/api";
import { useSettings } from "../context/SettingsContext";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Input from "../components/Input";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import { toast } from "react-toastify";

const Employees = () => {
  const { t } = useSettings();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    fullName: "",
    email: "",
    department: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    employeeId: "",
    fullName: "",
    email: "",
    department: "",
  });

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
      !formData.department
    ) {
      setFormError("All fields are required");
      return;
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError("Please enter a valid email address");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      const response = await employeeAPI.create(formData);
      setShowModal(false);
      setFormData({ employeeId: "", fullName: "", email: "", department: "" });
      fetchEmployees();
      toast.success(`Employee ${formData.fullName} created successfully!`);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to create employee";
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
    setFormData({ employeeId: "", fullName: "", email: "", department: "" });
    setFormError("");
    setShowModal(true);
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

    return {
      employeeId: `EMP${randomNumber}`,
      fullName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNumber}@example.com`,
      department,
    };
  };
  const handleFillMockData = () => {
    setFormData(generateRandomEmployee());
    setFormError("");
  };
  if (loading) {
    return <LoadingSpinner size="lg" text={t('loading')} />;
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
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('employeeId')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('fullName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('department')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEmployees.map((employee) => (
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="danger"
                      onClick={() =>
                        handleDelete(employee._id, employee.fullName)
                      }
                      className="text-sm"
                    >
                      {t('delete')}
                    </Button>
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
        title={t('addNewEmployee')}
      >
        <form onSubmit={handleSubmit}>
          {/* Mock Data Button */}
          {process.env.NODE_ENV === "development" && (
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

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
              disabled={submitting}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t('loading') : t('addEmployee')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Employees;
