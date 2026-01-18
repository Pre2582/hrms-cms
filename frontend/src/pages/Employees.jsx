import { useState, useEffect } from "react";
import { employeeAPI } from "../services/api";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Input from "../components/Input";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import { toast } from "react-toastify";

const Employees = () => {
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
    return <LoadingSpinner size="lg" text="Loading employees..." />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Employee Management
        </h1>
        <Button onClick={openAddModal}>+ Add Employee</Button>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchEmployees} />}

      {!error && employees.length === 0 && (
        <EmptyState
          title="No employees found"
          description="Get started by adding your first employee to the system."
          icon="👥"
          action={<Button onClick={openAddModal}>Add First Employee</Button>}
        />
      )}

      {!error && employees.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Full Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr
                  key={employee._id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {employee.employeeId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {employee.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
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
                      Delete
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
        title="Add New Employee"
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
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {formError}
            </div>
          )}

          <Input
            label="Employee ID"
            name="employeeId"
            value={formData.employeeId}
            onChange={handleInputChange}
            placeholder="e.g., EMP001"
            required
          />

          <Input
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="e.g., John Doe"
            required
          />

          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="e.g., john@example.com"
            required
          />

          <Input
            label="Department"
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
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add Employee"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Employees;
