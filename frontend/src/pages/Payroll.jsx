import { useState, useEffect, useCallback } from 'react';
import { payrollAPI, employeeAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { toast } from 'react-toastify';

const STATUS_COLORS = {
  Draft: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  Processed: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  Approved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  Paid: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
  Locked: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
};

const Payroll = () => {
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState('payroll');
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [stats, setStats] = useState({});
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const [salaryForm, setSalaryForm] = useState({
    employeeId: '', basic: '', hra: '',
    allowances: { conveyance: '', medical: '', special: '', lta: '', food: '', other: '' },
    deductions: { pf: '', esi: '', professionalTax: '', tds: '', loanRecovery: '', other: '' }
  });
  const [bonusForm, setBonusForm] = useState({
    employeeId: '', type: 'Performance Bonus', amount: '', month: selectedMonth, year: selectedYear, reason: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, payRes, salRes, bonRes, statsRes] = await Promise.all([
        employeeAPI.getAll(),
        payrollAPI.getPayroll({ month: selectedMonth, year: selectedYear }),
        payrollAPI.getAllSalaryStructures(),
        payrollAPI.getBonuses({ month: selectedMonth, year: selectedYear }),
        payrollAPI.getStats(selectedMonth, selectedYear)
      ]);
      setEmployees(empRes.data.data || []);
      setPayrollRecords(payRes.data.data || []);
      setSalaryStructures(salRes.data.data || []);
      setBonuses(bonRes.data.data || []);
      setStats(statsRes.data.data || {});
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleProcessPayroll = async () => {
    if (!window.confirm(`Process payroll for ${getMonthName(selectedMonth)} ${selectedYear}?`)) return;
    try {
      setSubmitting(true);
      const res = await payrollAPI.processPayroll({ month: selectedMonth, year: selectedYear, processedBy: 'HR Admin' });
      toast.success(`Payroll processed for ${res.data.data.processed.length} employees`);
      if (res.data.data.errors.length > 0) {
        toast.warning(`${res.data.data.errors.length} employees had errors`);
      }
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process payroll');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLockPayroll = async () => {
    if (!window.confirm(`Lock payroll for ${getMonthName(selectedMonth)} ${selectedYear}? This cannot be undone.`)) return;
    try {
      await payrollAPI.lockPayroll(selectedMonth, selectedYear);
      toast.success('Payroll locked');
      fetchData();
    } catch (err) {
      toast.error('Failed to lock payroll');
    }
  };

  const handleApprovePayroll = async (id) => {
    try {
      await payrollAPI.approvePayroll(id, { approvedBy: 'HR Admin' });
      toast.success('Payroll approved');
      fetchData();
    } catch (err) {
      toast.error('Failed to approve');
    }
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const data = {
        ...salaryForm,
        basic: parseFloat(salaryForm.basic) || 0,
        hra: parseFloat(salaryForm.hra) || 0,
        allowances: Object.fromEntries(Object.entries(salaryForm.allowances).map(([k, v]) => [k, parseFloat(v) || 0])),
        deductions: Object.fromEntries(Object.entries(salaryForm.deductions).map(([k, v]) => [k, parseFloat(v) || 0]))
      };
      await payrollAPI.saveSalaryStructure(data);
      toast.success('Salary structure saved');
      setShowSalaryModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBonus = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await payrollAPI.createBonus({ ...bonusForm, amount: parseFloat(bonusForm.amount) });
      toast.success('Bonus created');
      setShowBonusModal(false);
      setBonusForm({ employeeId: '', type: 'Performance Bonus', amount: '', month: selectedMonth, year: selectedYear, reason: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create bonus');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveBonus = async (id) => {
    try {
      await payrollAPI.approveBonus(id, { approvedBy: 'HR Admin' });
      toast.success('Bonus approved');
      fetchData();
    } catch (err) {
      toast.error('Failed to approve bonus');
    }
  };

  const viewPayslip = async (employeeId) => {
    try {
      const res = await payrollAPI.getPayslip(employeeId, selectedMonth, selectedYear);
      setSelectedPayslip(res.data.data);
      setShowPayslipModal(true);
    } catch (err) {
      toast.error('Failed to load payslip');
    }
  };

  const openSalaryModal = (structure = null) => {
    if (structure) {
      setSalaryForm({
        employeeId: structure.employeeId,
        basic: structure.basic || '',
        hra: structure.hra || '',
        allowances: structure.allowances || {},
        deductions: structure.deductions || {}
      });
    } else {
      setSalaryForm({
        employeeId: '', basic: '', hra: '',
        allowances: { conveyance: '', medical: '', special: '', lta: '', food: '', other: '' },
        deductions: { pf: '', esi: '', professionalTax: '', tds: '', loanRecovery: '', other: '' }
      });
    }
    setShowSalaryModal(true);
  };

  const fillSalarySampleData = () => {
    const basic = Math.floor(Math.random() * (80000 - 25000 + 1)) + 25000;
    const hra = Math.floor(basic * 0.4); // 40% of basic
    const pf = Math.floor(basic * 0.12); // 12% of basic
    
    setSalaryForm({
      employeeId: employees.length > 0 ? employees[Math.floor(Math.random() * employees.length)].employeeId : '',
      basic: basic.toString(),
      hra: hra.toString(),
      allowances: {
        conveyance: '2500',
        medical: '1500',
        special: Math.floor(Math.random() * 10000 + 5000).toString(),
        lta: '3000',
        food: '1200',
        other: Math.floor(Math.random() * 2000).toString()
      },
      deductions: {
        pf: pf.toString(),
        esi: basic <= 21000 ? Math.floor(basic * 0.0075).toString() : '0',
        professionalTax: basic > 20000 ? '200' : basic > 15000 ? '150' : '0',
        tds: Math.floor(basic * 0.05).toString(),
        loanRecovery: '0',
        other: '0'
      }
    });
    toast.success('Sample salary data filled!');
  };

  const fillBonusSampleData = () => {
    const bonusTypes = ['Performance Bonus', 'Festival Bonus', 'Annual Bonus', 'Referral Bonus', 'Incentive'];
    const reasons = [
      'Excellent quarterly performance',
      'Diwali festival bonus',
      'Annual performance reward',
      'Employee referral program',
      'Project completion incentive',
      'Sales target achievement'
    ];
    
    setBonusForm({
      employeeId: employees.length > 0 ? employees[Math.floor(Math.random() * employees.length)].employeeId : '',
      type: bonusTypes[Math.floor(Math.random() * bonusTypes.length)],
      amount: (Math.floor(Math.random() * (50000 - 5000 + 1)) + 5000).toString(),
      month: selectedMonth,
      year: selectedYear,
      reason: reasons[Math.floor(Math.random() * reasons.length)]
    });
    toast.success('Sample bonus data filled!');
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  const getMonthName = (m) => new Date(2000, m - 1).toLocaleString('default', { month: 'long' });

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Payroll Management</h1>
        <SkeletonLoader type="table" rows={5} columns={4} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payroll Management</h1>
        <div className="flex items-center gap-4">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="text-3xl font-bold">{formatCurrency(stats.totalGross)}</div>
          <div className="text-sm opacity-90">Total Gross</div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
          <div className="text-3xl font-bold">{formatCurrency(stats.totalDeductions)}</div>
          <div className="text-sm opacity-90">Total Deductions</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="text-3xl font-bold">{formatCurrency(stats.totalNet)}</div>
          <div className="text-sm opacity-90">Net Payable</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="text-3xl font-bold">{stats.processed || 0}/{stats.totalEmployees || 0}</div>
          <div className="text-sm opacity-90">Processed</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button onClick={handleProcessPayroll} disabled={submitting}>🔄 Process Payroll</Button>
        <Button variant="secondary" onClick={handleLockPayroll}>🔒 Lock Payroll</Button>
        <Button variant="secondary" onClick={() => openSalaryModal()}>💰 Add Salary Structure</Button>
        <Button variant="secondary" onClick={() => setShowBonusModal(true)}>🎁 Add Bonus</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {['payroll', 'salary', 'bonuses'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${activeTab === tab 
              ? 'text-primary-600 border-b-2 border-primary-600' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            {tab === 'payroll' ? 'Monthly Payroll' : tab === 'salary' ? 'Salary Structures' : 'Bonuses'}
          </button>
        ))}
      </div>

      {/* Payroll Tab */}
      {activeTab === 'payroll' && (
        payrollRecords.length === 0 ? (
          <EmptyState title="No payroll records" description={`Process payroll for ${getMonthName(selectedMonth)} ${selectedYear}`} icon="💵" />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['Employee', 'Gross', 'Deductions', 'Net Payable', 'Working Days', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {payrollRecords.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{p.employeeName}</div>
                        <div className="text-xs text-gray-500">{p.department}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{formatCurrency(p.grossEarnings)}</td>
                      <td className="px-4 py-4 text-sm text-red-600">{formatCurrency(p.totalDeductions)}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-green-600">{formatCurrency(p.netPayable)}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{p.attendance?.presentDays || 0}/{p.attendance?.workingDays || 0}</td>
                      <td className="px-4 py-4"><span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[p.status]}`}>{p.status}</span></td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => viewPayslip(p.employeeId)} className="text-xs text-primary-600 hover:underline">Payslip</button>
                          {p.status === 'Processed' && !p.isLocked && (
                            <button onClick={() => handleApprovePayroll(p._id)} className="text-xs text-green-600 hover:underline">Approve</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Salary Structures Tab */}
      {activeTab === 'salary' && (
        salaryStructures.length === 0 ? (
          <EmptyState title="No salary structures" description="Add salary structures for employees" icon="💰" />
        ) : (
          <div className="grid gap-4">
            {salaryStructures.map(s => (
              <div key={s._id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{s.employeeName}</h3>
                    <p className="text-sm text-gray-500">{s.department} • {s.employeeId}</p>
                  </div>
                  <button onClick={() => openSalaryModal(s)} className="text-primary-600 hover:underline text-sm">Edit</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                    <div className="text-xs text-gray-500">Basic</div>
                    <div className="font-semibold">{formatCurrency(s.basic)}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                    <div className="text-xs text-gray-500">HRA</div>
                    <div className="font-semibold">{formatCurrency(s.hra)}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded p-3">
                    <div className="text-xs text-green-600">Gross</div>
                    <div className="font-semibold text-green-600">{formatCurrency(s.grossSalary)}</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                    <div className="text-xs text-blue-600">Net</div>
                    <div className="font-semibold text-blue-600">{formatCurrency(s.netSalary)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Bonuses Tab */}
      {activeTab === 'bonuses' && (
        bonuses.length === 0 ? (
          <EmptyState title="No bonuses" description="Add bonuses for employees" icon="🎁" />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['Employee', 'Type', 'Amount', 'Reason', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {bonuses.map(b => (
                    <tr key={b._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{b.employeeName}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{b.type}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-green-600">{formatCurrency(b.amount)}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{b.reason || '-'}</td>
                      <td className="px-4 py-4"><span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[b.status] || STATUS_COLORS.Draft}`}>{b.status}</span></td>
                      <td className="px-4 py-4">
                        {b.status === 'Pending' && (
                          <button onClick={() => handleApproveBonus(b._id)} className="text-xs text-green-600 hover:underline">Approve</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Salary Structure Modal */}
      <Modal isOpen={showSalaryModal} onClose={() => setShowSalaryModal(false)} title="Salary Structure">
        <form onSubmit={handleSaveSalary} className="space-y-4">
          {/* Fill Sample Data Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={fillSalarySampleData}
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
            <select value={salaryForm.employeeId} onChange={(e) => setSalaryForm({...salaryForm, employeeId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required>
              <option value="">Select Employee</option>
              {employees.map(e => <option key={e._id} value={e.employeeId}>{e.fullName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Basic *" type="number" value={salaryForm.basic} onChange={(e) => setSalaryForm({...salaryForm, basic: e.target.value})} required />
            <Input label="HRA" type="number" value={salaryForm.hra} onChange={(e) => setSalaryForm({...salaryForm, hra: e.target.value})} />
          </div>
          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Allowances</h4>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(salaryForm.allowances).map(key => (
                <Input key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} type="number" value={salaryForm.allowances[key]}
                  onChange={(e) => setSalaryForm({...salaryForm, allowances: {...salaryForm.allowances, [key]: e.target.value}})} />
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Deductions</h4>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(salaryForm.deductions).map(key => (
                <Input key={key} label={key === 'pf' ? 'PF' : key === 'esi' ? 'ESI' : key === 'tds' ? 'TDS' : key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')} 
                  type="number" value={salaryForm.deductions[key]}
                  onChange={(e) => setSalaryForm({...salaryForm, deductions: {...salaryForm.deductions, [key]: e.target.value}})} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowSalaryModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      {/* Bonus Modal */}
      <Modal isOpen={showBonusModal} onClose={() => setShowBonusModal(false)} title="Add Bonus">
        <form onSubmit={handleCreateBonus} className="space-y-4">
          {/* Fill Sample Data Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={fillBonusSampleData}
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
            <select value={bonusForm.employeeId} onChange={(e) => setBonusForm({...bonusForm, employeeId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required>
              <option value="">Select Employee</option>
              {employees.map(e => <option key={e._id} value={e.employeeId}>{e.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
            <select value={bonusForm.type} onChange={(e) => setBonusForm({...bonusForm, type: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {['Performance Bonus', 'Festival Bonus', 'Annual Bonus', 'Referral Bonus', 'Incentive', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Input label="Amount *" type="number" value={bonusForm.amount} onChange={(e) => setBonusForm({...bonusForm, amount: e.target.value})} required />
          <Input label="Reason" value={bonusForm.reason} onChange={(e) => setBonusForm({...bonusForm, reason: e.target.value})} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowBonusModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Payslip Modal */}
      <Modal isOpen={showPayslipModal} onClose={() => setShowPayslipModal(false)} title="Payslip">
        {selectedPayslip && (
          <div className="space-y-4">
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold">{selectedPayslip.company?.name}</h2>
              <p className="text-sm text-gray-500">Payslip for {getMonthName(selectedPayslip.month)} {selectedPayslip.year}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Name:</strong> {selectedPayslip.employee?.name}</div>
              <div><strong>Employee ID:</strong> {selectedPayslip.employee?.employeeId}</div>
              <div><strong>Department:</strong> {selectedPayslip.employee?.department}</div>
              <div><strong>Working Days:</strong> {selectedPayslip.attendance?.presentDays}/{selectedPayslip.attendance?.workingDays}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Earnings</h4>
                {Object.entries(selectedPayslip.earnings || {}).filter(([, v]) => v > 0).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm"><span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</span><span>{formatCurrency(v)}</span></div>
                ))}
                <div className="flex justify-between font-bold mt-2 pt-2 border-t border-green-200"><span>Total</span><span>{formatCurrency(selectedPayslip.grossEarnings)}</span></div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Deductions</h4>
                {Object.entries(selectedPayslip.deductions || {}).filter(([, v]) => v > 0).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm"><span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</span><span>{formatCurrency(v)}</span></div>
                ))}
                <div className="flex justify-between font-bold mt-2 pt-2 border-t border-red-200"><span>Total</span><span>{formatCurrency(selectedPayslip.totalDeductions)}</span></div>
              </div>
            </div>
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 text-center">
              <div className="text-sm text-primary-600">Net Payable</div>
              <div className="text-3xl font-bold text-primary-700 dark:text-primary-400">{formatCurrency(selectedPayslip.netPayable)}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Payroll;
