import { useState, useEffect, useCallback } from 'react';
import { documentAPI, employeeAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { toast } from 'react-toastify';

const CATEGORY_ICONS = {
  'Company Policy': '📋',
  'Offer Letter': '💼',
  'Appointment Letter': '📄',
  'NDA': '🔒',
  'Compliance': '✅',
  'Contract': '📝',
  'Certificate': '🏆',
  'Other': '📁'
};

const ACCESS_COLORS = {
  'Public': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  'HR Only': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
  'Employee Specific': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  'Confidential': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
};

const Documents = () => {
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAccessLevel, setFilterAccessLevel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [documentForm, setDocumentForm] = useState({
    title: '', description: '', category: 'Company Policy', documentType: 'General',
    employeeId: '', fileName: '', fileSize: 0, fileType: 'application/pdf',
    accessLevel: 'Public', allowedRoles: ['Admin', 'HR', 'Manager', 'Employee'],
    version: '1.0', requiresAcknowledgment: false, tags: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, docsRes, statsRes] = await Promise.all([
        employeeAPI.getAll(),
        documentAPI.getDocuments({}),
        documentAPI.getStats()
      ]);
      setEmployees(empRes.data.data || []);
      setDocuments(docsRes.data.data || []);
      setStats(statsRes.data.data || {});
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInitialize = async () => {
    try {
      await documentAPI.initializeSampleDocuments();
      toast.success('Sample documents initialized');
      fetchData();
    } catch (err) {
      toast.error('Failed to initialize documents');
    }
  };

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const data = {
        ...documentForm,
        tags: documentForm.tags.split(',').map(t => t.trim()).filter(t => t),
        fileSize: parseInt(documentForm.fileSize) || 0
      };
      await documentAPI.createDocument(data);
      toast.success('Document uploaded successfully');
      setShowUploadModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      await documentAPI.trackDownload(doc._id, { accessedBy: 'Current User' });
      toast.success(`Downloading ${doc.fileName}`);
      // In a real implementation, this would trigger actual file download
      window.open(doc.fileUrl, '_blank');
    } catch (err) {
      toast.error('Failed to download document');
    }
  };

  const handleAcknowledge = async (doc) => {
    try {
      await documentAPI.acknowledgeDocument(doc._id, { employeeId: 'EMP001' });
      toast.success('Document acknowledged');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to acknowledge');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await documentAPI.deleteDocument(id);
      toast.success('Document deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete document');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchData();
      return;
    }
    try {
      const res = await documentAPI.searchDocuments(searchQuery);
      setDocuments(res.data.data || []);
    } catch (err) {
      toast.error('Search failed');
    }
  };

  const fillSampleData = () => {
    setDocumentForm({
      title: 'Employee Handbook 2024',
      description: 'Complete guide to company policies and procedures',
      category: 'Company Policy',
      documentType: 'General',
      employeeId: '',
      fileName: 'employee_handbook_2024.pdf',
      fileSize: '2048000',
      fileType: 'application/pdf',
      accessLevel: 'Public',
      allowedRoles: ['Admin', 'HR', 'Manager', 'Employee'],
      version: '1.0',
      requiresAcknowledgment: true,
      tags: 'policy, handbook, guidelines'
    });
    toast.success('Sample data filled!');
  };

  const resetForm = () => {
    setDocumentForm({
      title: '', description: '', category: 'Company Policy', documentType: 'General',
      employeeId: '', fileName: '', fileSize: 0, fileType: 'application/pdf',
      accessLevel: 'Public', allowedRoles: ['Admin', 'HR', 'Manager', 'Employee'],
      version: '1.0', requiresAcknowledgment: false, tags: ''
    });
  };

  const filteredDocuments = documents.filter(doc => {
    if (activeTab !== 'all' && doc.category !== activeTab) return false;
    if (filterCategory && doc.category !== filterCategory) return false;
    if (filterAccessLevel && doc.accessLevel !== filterAccessLevel) return false;
    return true;
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Document Management</h1>
        <SkeletonLoader type="table" rows={5} columns={4} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">HR Document Center</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleInitialize}>Initialize Sample Docs</Button>
          <Button onClick={() => setShowUploadModal(true)}>+ Upload Document</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalDocuments || 0}</div>
          <div className="text-sm text-blue-700 dark:text-blue-300">Total Documents</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.totalDownloads || 0}</div>
          <div className="text-sm text-green-700 dark:text-green-300">Total Downloads</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.byCategory?.['Company Policy'] || 0}</div>
          <div className="text-sm text-purple-700 dark:text-purple-300">Company Policies</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.pendingAcknowledgments || 0}</div>
          <div className="text-sm text-orange-700 dark:text-orange-300">Pending Acknowledgments</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search documents..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <Button onClick={handleSearch}>Search</Button>
            </div>
          </div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">All Categories</option>
            {Object.keys(CATEGORY_ICONS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select value={filterAccessLevel} onChange={(e) => setFilterAccessLevel(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">All Access Levels</option>
            {Object.keys(ACCESS_COLORS).map(level => <option key={level} value={level}>{level}</option>)}
          </select>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setActiveTab('all')} className={`px-4 py-2 font-medium whitespace-nowrap transition-colors ${activeTab === 'all' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
          All Documents
        </button>
        {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
          <button key={cat} onClick={() => setActiveTab(cat)} className={`px-4 py-2 font-medium whitespace-nowrap transition-colors ${activeTab === cat ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            {icon} {cat}
          </button>
        ))}
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <EmptyState title="No documents" description="Upload documents to get started" icon="📁" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map(doc => (
            <div key={doc._id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{CATEGORY_ICONS[doc.category] || '📄'}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{doc.title}</h3>
                    <p className="text-xs text-gray-500">{doc.category}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(doc._id)} className="text-red-500 hover:text-red-700">✕</button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{doc.description}</p>
              
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">File:</span>
                  <span className="font-medium">{doc.fileName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Size:</span>
                  <span className="font-medium">{formatFileSize(doc.fileSize)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Version:</span>
                  <span className="font-medium">v{doc.version}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Uploaded:</span>
                  <span className="font-medium">{formatDate(doc.uploadedOn)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Downloads:</span>
                  <span className="font-medium">{doc.downloadCount}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-2 py-1 text-xs rounded-full ${ACCESS_COLORS[doc.accessLevel]}`}>{doc.accessLevel}</span>
                {doc.requiresAcknowledgment && (
                  <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">Requires Acknowledgment</span>
                )}
              </div>

              {doc.tags && doc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {doc.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">{tag}</span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => handleDownload(doc)} className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
                  Download
                </button>
                {doc.requiresAcknowledgment && (
                  <button onClick={() => handleAcknowledge(doc)} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                    Acknowledge
                  </button>
                )}
                <button onClick={() => { setSelectedDocument(doc); setShowDetailModal(true); }} className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Document Modal */}
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Document">
        <form onSubmit={handleCreateDocument} className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={fillSampleData} className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Fill with Sample Data
            </button>
          </div>
          
          <Input label="Title *" value={documentForm.title} onChange={(e) => setDocumentForm({...documentForm, title: e.target.value})} required />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea value={documentForm.description} onChange={(e) => setDocumentForm({...documentForm, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
              <select value={documentForm.category} onChange={(e) => setDocumentForm({...documentForm, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required>
                {Object.keys(CATEGORY_ICONS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Type</label>
              <select value={documentForm.documentType} onChange={(e) => setDocumentForm({...documentForm, documentType: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="General">General</option>
                <option value="Employee Specific">Employee Specific</option>
              </select>
            </div>
          </div>

          {documentForm.documentType === 'Employee Specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee</label>
              <select value={documentForm.employeeId} onChange={(e) => setDocumentForm({...documentForm, employeeId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e._id} value={e.employeeId}>{e.fullName}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="File Name *" value={documentForm.fileName} onChange={(e) => setDocumentForm({...documentForm, fileName: e.target.value})} required />
            <Input label="File Size (bytes)" type="number" value={documentForm.fileSize} onChange={(e) => setDocumentForm({...documentForm, fileSize: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Level</label>
              <select value={documentForm.accessLevel} onChange={(e) => setDocumentForm({...documentForm, accessLevel: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                {Object.keys(ACCESS_COLORS).map(level => <option key={level} value={level}>{level}</option>)}
              </select>
            </div>
            <Input label="Version" value={documentForm.version} onChange={(e) => setDocumentForm({...documentForm, version: e.target.value})} />
          </div>

          <Input label="Tags (comma separated)" value={documentForm.tags} onChange={(e) => setDocumentForm({...documentForm, tags: e.target.value})} placeholder="policy, handbook, guidelines" />

          <div className="flex items-center gap-2">
            <input type="checkbox" id="requireAck" checked={documentForm.requiresAcknowledgment} onChange={(e) => setDocumentForm({...documentForm, requiresAcknowledgment: e.target.checked})} />
            <label htmlFor="requireAck" className="text-sm text-gray-700 dark:text-gray-300">Requires Acknowledgment</label>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowUploadModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Uploading...' : 'Upload'}</Button>
          </div>
        </form>
      </Modal>

      {/* Document Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Document Details">
        {selectedDocument && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{CATEGORY_ICONS[selectedDocument.category]}</span>
              <div>
                <h3 className="text-xl font-semibold">{selectedDocument.title}</h3>
                <p className="text-sm text-gray-500">{selectedDocument.category}</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">File Name:</span> <span className="font-medium">{selectedDocument.fileName}</span></div>
                <div><span className="text-gray-500">File Size:</span> <span className="font-medium">{formatFileSize(selectedDocument.fileSize)}</span></div>
                <div><span className="text-gray-500">Version:</span> <span className="font-medium">v{selectedDocument.version}</span></div>
                <div><span className="text-gray-500">Downloads:</span> <span className="font-medium">{selectedDocument.downloadCount}</span></div>
                <div><span className="text-gray-500">Uploaded By:</span> <span className="font-medium">{selectedDocument.uploadedBy}</span></div>
                <div><span className="text-gray-500">Uploaded On:</span> <span className="font-medium">{formatDate(selectedDocument.uploadedOn)}</span></div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedDocument.description || 'No description provided'}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Access Control</h4>
              <span className={`px-3 py-1 text-sm rounded-full ${ACCESS_COLORS[selectedDocument.accessLevel]}`}>{selectedDocument.accessLevel}</span>
            </div>

            {selectedDocument.tags && selectedDocument.tags.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDocument.tags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedDocument.acknowledgedBy && selectedDocument.acknowledgedBy.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Acknowledged By ({selectedDocument.acknowledgedBy.length})</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedDocument.acknowledgedBy.map((ack, idx) => (
                    <div key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                      {ack.employeeId} - {formatDate(ack.acknowledgedOn)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Documents;
