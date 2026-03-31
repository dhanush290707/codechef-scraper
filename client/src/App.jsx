import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  Search, Trophy, Globe, MapPin, Building, History, Moon, Sun, Download, Upload,
  FileSpreadsheet, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Filter,
  LogOut, Save, Shield, Eye, Plus, Database
} from 'lucide-react';
import './index.css';
import { API_BASE_URL as API_BASE } from './config';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import ViewerDashboard from './ViewerDashboard';

const TABLE_COLUMNS = [
  { key: 'username', label: 'Username', type: 'string' },
  { key: 'rating', label: 'Rating', type: 'number' },
  { key: 'stars', label: 'Stars', type: 'number' },
  { key: 'division', label: 'Division', type: 'string' },
  { key: 'globalRank', label: 'Global Rank', type: 'number' },
  { key: 'countryRank', label: 'Country Rank', type: 'number' },
  { key: 'highestRating', label: 'Highest Rating', type: 'number' },
  { key: 'country', label: 'Country', type: 'string' },
  { key: 'institution', label: 'Institution', type: 'string' },
];

const ITEMS_PER_PAGE = 12;

function getStarColor(stars) {
  const n = typeof stars === 'number' ? stars : 0;
  if (n >= 7) return '#e74c3c';
  if (n >= 6) return '#e67e22';
  if (n >= 5) return '#9b59b6';
  if (n >= 4) return '#3498db';
  if (n >= 3) return '#2ecc71';
  if (n >= 2) return '#27ae60';
  if (n >= 1) return '#95a5a6';
  return '#bdc3c7';
}

function ProfileGrid({ data, title, onSaveToDb, savingToDb, sections, authAxios }) {
  const [filterText, setFilterText] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Save-to-DB section selectors
  const [saveStudyYear, setSaveStudyYear] = useState('');
  const [saveAcademicYear, setSaveAcademicYear] = useState('');
  const [saveSectionNumber, setSaveSectionNumber] = useState('');
  const [addingSectionMode, setAddingSectionMode] = useState(false);
  const [newSectionInput, setNewSectionInput] = useState('');
  const [addingSectionLoading, setAddingSectionLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const filtered = useMemo(() => {
    let rows = [...data];
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      rows = rows.filter(r =>
        TABLE_COLUMNS.some(c => String(r[c.key] ?? '').toLowerCase().includes(q))
      );
    }
    rows.sort((a, b) => {
      const ra = typeof a.rating === 'number' ? a.rating : -1;
      const rb = typeof b.rating === 'number' ? b.rating : -1;
      return rb - ra;
    });
    return rows;
  }, [data, filterText]);

  useEffect(() => { setCurrentPage(1); }, [filterText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = filtered.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push('...');
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSelectedUser(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSave = async () => {
    if (!saveStudyYear || !saveAcademicYear || !saveSectionNumber) return;
    const result = await onSaveToDb(filtered, saveStudyYear, saveAcademicYear, saveSectionNumber);
    if (result) {
      setSaveSuccess(result);
      setTimeout(() => setSaveSuccess(''), 4000);
    }
  };

  const handleAddSection = async () => {
    if (!newSectionInput.trim() || !authAxios) return;
    setAddingSectionLoading(true);
    try {
      await authAxios.post(`${API_BASE}/api/sections`, { sectionNumber: newSectionInput.trim() });
      setNewSectionInput('');
      setAddingSectionMode(false);
      // Refresh sections (parent will re-fetch)
      if (window.__refreshSections) window.__refreshSections();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add section');
    } finally {
      setAddingSectionLoading(false);
    }
  };

  if (!data || data.length === 0) return null;

  return (
    <div className="profile-grid-section fade-in">
      {title && <h3 className="table-title">{title}</h3>}
      <div className="table-controls">
        <div className="table-filter">
          <Filter size={14} />
          <input
            type="text"
            placeholder="Search users..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
          {filterText && (
            <button className="filter-clear" onClick={() => setFilterText('')}><X size={12} /></button>
          )}
        </div>
        <span className="table-count">{filtered.length} of {data.length} users</span>
      </div>

      <div className="card-grid">
        {paginatedData.map((row, i) => {
          const starCount = parseInt(row.stars) || 0;
          const starColor = getStarColor(starCount);
          return (
            <div key={i} className="user-card" onClick={() => setSelectedUser(row)}>
              <div className="user-card-stars" style={{ color: starColor }}>
                {starCount > 0 ? '★'.repeat(starCount) : '☆'}
              </div>
              <div className="user-card-name">{row.username ?? 'N/A'}</div>
              <div className="user-card-rating">
                {typeof row.rating === 'number' ? row.rating : 'N/A'}
              </div>
              <div className="user-card-div">{row.division ?? ''}</div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            className="pagination-btn pagination-nav"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safeCurrentPage === 1}
          >
            <ChevronLeft size={16} />
          </button>
          {getPageNumbers().map((page, idx) =>
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
            ) : (
              <button
                key={page}
                className={`pagination-btn pagination-num ${page === safeCurrentPage ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            )
          )}
          <button
            className="pagination-btn pagination-nav"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage === totalPages}
          >
            <ChevronRight size={16} />
          </button>
          <span className="pagination-info">Page {safeCurrentPage} of {totalPages}</span>
        </div>
      )}

      {/* Save to Database Section (admin only) */}
      {onSaveToDb && sections && (
        <div className="save-to-db-section fade-in">
          <h4><Database size={16} /> Save to Database</h4>
          <p className="save-hint">Select section details to save {filtered.length} profile(s) to the database for viewers.</p>

          <div className="save-selectors">
            <div className="selector-group">
              <label>Study Year</label>
              <div className="select-wrapper">
                <select value={saveStudyYear} onChange={e => setSaveStudyYear(e.target.value)}>
                  <option value="">Select...</option>
                  {(sections?.studyYears || []).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-chevron" />
              </div>
            </div>

            <div className="selector-group">
              <label>Academic Year</label>
              <div className="select-wrapper">
                <select value={saveAcademicYear} onChange={e => setSaveAcademicYear(e.target.value)}>
                  <option value="">Select...</option>
                  {(sections?.academicYears || []).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-chevron" />
              </div>
            </div>

            <div className="selector-group">
              <label>Section Number</label>
              <div className="section-add-row">
                <div className="select-wrapper" style={{ flex: 1 }}>
                  <select value={saveSectionNumber} onChange={e => setSaveSectionNumber(e.target.value)}>
                    <option value="">Select...</option>
                    {(sections?.sectionNumbers || []).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="select-chevron" />
                </div>
                <button
                  className="add-section-toggle"
                  onClick={() => setAddingSectionMode(!addingSectionMode)}
                  title="Add new section"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {addingSectionMode && (
            <div className="add-section-form fade-in">
              <input
                type="text"
                placeholder="e.g. Section 4"
                value={newSectionInput}
                onChange={e => setNewSectionInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSection()}
              />
              <button onClick={handleAddSection} disabled={addingSectionLoading || !newSectionInput.trim()}>
                {addingSectionLoading ? <div className="spinner-small"></div> : 'Add'}
              </button>
              <button className="cancel-btn" onClick={() => { setAddingSectionMode(false); setNewSectionInput(''); }}>
                Cancel
              </button>
            </div>
          )}

          {saveSuccess && (
            <div className="success-toast fade-in" style={{ marginTop: '0.75rem' }}>✅ {saveSuccess}</div>
          )}

          <button
            className="save-db-btn"
            onClick={handleSave}
            disabled={savingToDb || !saveStudyYear || !saveAcademicYear || !saveSectionNumber}
          >
            {savingToDb ? <div className="spinner-small"></div> : <Save size={16} />}
            {savingToDb ? 'Saving...' : 'Save to Database'}
          </button>
        </div>
      )}

      {/* Drill-down Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-card fade-in" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedUser(null)}>
              <X size={18} />
            </button>
            <div className="modal-header">
              <div className="modal-stars" style={{ color: getStarColor(parseInt(selectedUser.stars) || 0) }}>
                {(parseInt(selectedUser.stars) || 0) > 0 ? '★'.repeat(parseInt(selectedUser.stars)) : '☆'}
              </div>
              <h2 className="modal-username">{selectedUser.username}</h2>
              <span className="modal-division-badge">{selectedUser.division ?? 'N/A'}</span>
            </div>
            <div className="modal-stats">
              <div className="modal-stat">
                <Trophy size={18} className="modal-stat-icon rating-icon" />
                <div>
                  <span className="modal-stat-label">Current Rating</span>
                  <span className="modal-stat-value">{selectedUser.rating ?? 'N/A'}</span>
                </div>
              </div>
              <div className="modal-stat">
                <Trophy size={18} className="modal-stat-icon" />
                <div>
                  <span className="modal-stat-label">Highest Rating</span>
                  <span className="modal-stat-value">{selectedUser.highestRating ?? 'N/A'}</span>
                </div>
              </div>
              <div className="modal-stat">
                <Globe size={18} className="modal-stat-icon" />
                <div>
                  <span className="modal-stat-label">Global Rank</span>
                  <span className="modal-stat-value">{selectedUser.globalRank ?? 'N/A'}</span>
                </div>
              </div>
              <div className="modal-stat">
                <MapPin size={18} className="modal-stat-icon" />
                <div>
                  <span className="modal-stat-label">Country Rank</span>
                  <span className="modal-stat-value">{selectedUser.countryRank ?? 'N/A'}</span>
                </div>
              </div>
              <div className="modal-stat">
                <MapPin size={18} className="modal-stat-icon" />
                <div>
                  <span className="modal-stat-label">Country</span>
                  <span className="modal-stat-value">{selectedUser.country ?? 'N/A'}</span>
                </div>
              </div>
              <div className="modal-stat">
                <Building size={18} className="modal-stat-icon" />
                <div>
                  <span className="modal-stat-label">Institution</span>
                  <span className="modal-stat-value">{selectedUser.institution ?? 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminDashboard() {
  const { user, logout, authAxios } = useAuth();
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [savingToDb, setSavingToDb] = useState(false);

  // Sections
  const [sections, setSections] = useState(null);

  // Bulk upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadError, setUploadError] = useState('');
  const [bulkJobId, setBulkJobId] = useState(null);
  const [bulkData, setBulkData] = useState([]);

  const [previewSheets, setPreviewSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('codechef_history')) || [];
    setHistory(savedHistory);
    if (darkMode) {
      document.body.classList.add('dark');
    }
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const { data } = await authAxios.get(`${API_BASE}/api/sections`);
      setSections(data);
    } catch { /* ignore */ }
  };

  // Expose fetchSections for child components
  window.__refreshSections = fetchSections;

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark');
  };

  const fetchProfile = async (searchUsername) => {
    if (!searchUsername.trim()) return;

    setLoading(true);
    setError('');
    setProfile(null);

    try {
      const uname = searchUsername.trim();
      const response = await axios.get(`${API_BASE}/api/codechef/${uname}`);
      setProfile(response.data);

      const newHistory = [uname, ...history.filter(h => h !== uname)].slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem('codechef_history', JSON.stringify(newHistory));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchProfile(username);
  };

  const handleDownloadExcel = async () => {
    if (!profile || !profile.username) return;

    setDownloadingExcel(true);
    setDownloadSuccess(false);
    setError('');

    try {
      const response = await authAxios.get(`${API_BASE}/api/codechef/${profile.username}/excel`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${profile.username}_codechef_profile.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      setError('Failed to download Excel file. Please try again.');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleSaveToDb = async (profiles, studyYear, academicYear, sectionNumber) => {
    setSavingToDb(true);
    try {
      const { data } = await authAxios.post(`${API_BASE}/api/profiles/save`, {
        profiles,
        studyYear,
        academicYear,
        sectionNumber
      });
      setSavingToDb(false);
      return data.message;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save to database');
      setSavingToDb(false);
      return null;
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadFile(file);
    setUploadError('');
    setUploadStatus('previewing');
    setPreviewSheets([]);
    setSelectedSheet('');
    setSelectedColumn('');
    setBulkData([]);
    setBulkJobId(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await authAxios.post(`${API_BASE}/api/codechef/bulk-excel/preview`, formData);

      setPreviewSheets(data.sheets);
      if (data.sheets.length > 0) {
        setSelectedSheet(data.sheets[0].name);
        const autoCol = data.sheets[0].columns.find(c => c.toLowerCase() === 'username');
        setSelectedColumn(autoCol || data.sheets[0].columns[0] || '');
      }
      setUploadStatus('previewed');
    } catch (err) {
      setUploadStatus('error');
      setUploadError(err.response?.data?.error || 'Failed to read Excel file.');
    }
  };

  const handleSheetChange = (sheetName) => {
    setSelectedSheet(sheetName);
    const sheet = previewSheets.find(s => s.name === sheetName);
    if (sheet) {
      const autoCol = sheet.columns.find(c => c.toLowerCase() === 'username');
      setSelectedColumn(autoCol || sheet.columns[0] || '');
    }
  };

  const resetUpload = () => {
    setUploadFile(null);
    setUploadStatus('idle');
    setUploadError('');
    setUploadProgress(null);
    setPreviewSheets([]);
    setSelectedSheet('');
    setSelectedColumn('');
    setBulkData([]);
    setBulkJobId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fetchBulkData = async (jobId) => {
    try {
      const { data } = await authAxios.get(`${API_BASE}/api/codechef/job/${jobId}/data`);
      setBulkData(data.rows || []);
    } catch {
      setBulkData([]);
    }
  };

  const handleBulkDownload = () => {
    if (!bulkJobId) return;
    const a = document.createElement('a');
    a.href = `${API_BASE}/api/codechef/job/${bulkJobId}/download`;
    a.download = 'updated_codechef_profiles.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !selectedColumn) return;

    setUploadStatus('uploading');
    setUploadError('');
    setUploadProgress(null);
    setBulkData([]);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('sheetName', selectedSheet);
    formData.append('usernameColumn', selectedColumn);

    try {
      const { data } = await authAxios.post(`${API_BASE}/api/codechef/bulk-excel`, formData);

      const jobId = data.jobId;
      setBulkJobId(jobId);
      setUploadStatus('processing');

      const eventSource = new EventSource(`${API_BASE}/api/codechef/job/${jobId}/progress`);

      eventSource.onmessage = (event) => {
        const progressData = JSON.parse(event.data);
        setUploadProgress(progressData);

        if (progressData.status === 'completed') {
          eventSource.close();
          setUploadStatus('complete');
          fetchBulkData(jobId);
        } else if (progressData.status === 'error') {
          eventSource.close();
          setUploadStatus('error');
          setUploadError('Background processing failed on server.');
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setUploadStatus('error');
        setUploadError('Lost connection to server during processing.');
      };

    } catch (err) {
      setUploadStatus('error');
      setUploadError(err.response?.data?.error || 'Upload failed.');
    }
  };

  const currentSheetColumns = previewSheets.find(s => s.name === selectedSheet)?.columns || [];
  const isProcessing = uploadStatus === 'uploading' || uploadStatus === 'processing';
  const progressPercent = uploadProgress ? Math.round((uploadProgress.processed / uploadProgress.total) * 100) : 0;

  return (
    <div className={`app-container ${darkMode ? 'dark' : ''}`}>
      <div className="top-bar">
        <div className="theme-toggle" onClick={toggleDarkMode}>
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </div>
        <div className="user-badge">
          <Shield size={14} />
          <span>{user?.displayName || 'Admin'}</span>
          <span className="role-tag admin-tag">ADMIN</span>
        </div>
        <button className="logout-btn" onClick={logout}>
          <LogOut size={16} />
          Logout
        </button>
      </div>

      <main className="main-content">
        <div className="header">
          <h1>CodeChef Profiler</h1>
          <p>Admin Dashboard — Scrape, manage & save profiles</p>
        </div>

        <form onSubmit={handleSubmit} className="search-form">
          <div className="input-group">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Enter CodeChef username (e.g., kl2400030301)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button type="submit" disabled={loading}>
              {loading ? <div className="spinner"></div> : 'Fetch'}
            </button>
          </div>
        </form>

        {/* Bulk Upload Section */}
        <div className="bulk-upload-section fade-in">
          <div className="bulk-upload-header">
            <h3><FileSpreadsheet size={18} /> Bulk Excel Upload</h3>
            {uploadFile && uploadStatus !== 'idle' && (
              <button className="reset-btn" onClick={resetUpload} title="Clear">
                <X size={14} /> Clear
              </button>
            )}
          </div>
          <p className="bulk-upload-hint">Upload an Excel file with a column of CodeChef usernames to scrape profiles in bulk.</p>

          <form onSubmit={handleFileUpload} className="upload-form">
            <div className="file-picker">
              <label className={`file-label ${uploadFile ? 'has-file' : ''}`} htmlFor="bulk-file-input">
                <FileSpreadsheet size={16} />
                {uploadFile ? uploadFile.name : 'Choose .xlsx file'}
              </label>
              <input
                id="bulk-file-input"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={isProcessing}
                style={{ display: 'none' }}
              />
            </div>

            {uploadStatus === 'previewing' && (
              <div className="preview-loading fade-in">
                <div className="spinner-small"></div>
                <span>Reading file...</span>
              </div>
            )}

            {uploadStatus === 'previewed' && previewSheets.length > 0 && (
              <div className="preview-selectors fade-in">
                <div className="selector-group">
                  <label>Sheet</label>
                  <div className="select-wrapper">
                    <select value={selectedSheet} onChange={e => handleSheetChange(e.target.value)}>
                      {previewSheets.map(s => (
                        <option key={s.name} value={s.name}>
                          {s.name} ({s.rowCount} rows)
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                  </div>
                </div>
                <div className="selector-group">
                  <label>Username Column</label>
                  <div className="select-wrapper">
                    <select value={selectedColumn} onChange={e => setSelectedColumn(e.target.value)}>
                      {currentSheetColumns.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                  </div>
                </div>
              </div>
            )}

            {(uploadStatus === 'previewed' || isProcessing) && (
              <button
                type="submit"
                className="upload-btn"
                disabled={!uploadFile || !selectedColumn || isProcessing}
              >
                {isProcessing ? <div className="spinner-small"></div> : <Upload size={16} />}
                {isProcessing ? 'Processing...' : 'Upload & Process'}
              </button>
            )}
          </form>

          {uploadStatus === 'processing' && uploadProgress && (
            <div className="progress-container fade-in">
              <div className="progress-text">
                Processing {uploadProgress.processed} / {uploadProgress.total} users...
                <span className="progress-percent">{progressPercent}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          )}

          {uploadStatus === 'complete' && (
            <div className="bulk-complete-section fade-in">
              <div className="success-toast" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                ✅ Bulk processing complete! Preview the data below, then download or save.
              </div>
              <button className="download-btn" onClick={handleBulkDownload}>
                <Download size={16} /> Download Updated Excel
              </button>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="error-message fade-in" style={{ marginTop: '1rem', marginBottom: 0 }}>
              {uploadError}
            </div>
          )}
        </div>

        {/* Bulk data grid with save-to-db */}
        {bulkData.length > 0 && (
          <ProfileGrid
            data={bulkData}
            title={`Bulk Results (${bulkData.length} users)`}
            onSaveToDb={handleSaveToDb}
            savingToDb={savingToDb}
            sections={sections}
            authAxios={authAxios}
          />
        )}

        {history.length > 0 && (
          <div className="history">
            <h3><History size={16} /> Recent Searches</h3>
            <div className="history-tags">
              {history.map(h => (
                <span key={h} className="history-tag" onClick={() => { setUsername(h); fetchProfile(h); }}>
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">{error}</div>
        )}

        {profile && (
          <>
            <div className="profile-card fade-in">
              <div className="profile-header">
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                  <h2>{profile.username}</h2>
                  <div className="division-badge">{profile.division}</div>
                </div>
                <button
                  onClick={handleDownloadExcel}
                  className="excel-btn"
                  disabled={downloadingExcel}
                >
                  {downloadingExcel ? <div className="spinner-small"></div> : <Download size={18} />}
                  {downloadingExcel ? 'Exporting...' : 'Download Excel'}
                </button>
              </div>
              {downloadSuccess && (
                <div className="success-toast fade-in">
                  Excel file downloaded successfully!
                </div>
              )}

              <div className="rating-section">
                <div className="main-rating">
                  <Trophy className="rating-icon" size={32} />
                  <div className="rating-values">
                    <span className="current-rating">{profile.rating}</span>
                    <span className="stars">{typeof profile.stars === 'number' ? '★'.repeat(profile.stars) : profile.stars}</span>
                  </div>
                </div>
                <div className="highest-rating">
                  Highest Rating: <strong>{profile.highestRating}</strong>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-box">
                  <Globe size={24} className="stat-icon" />
                  <div className="stat-info">
                    <span className="stat-label">Global Rank</span>
                    <span className="stat-value">{profile.globalRank}</span>
                  </div>
                </div>
                <div className="stat-box">
                  <MapPin size={24} className="stat-icon" />
                  <div className="stat-info">
                    <span className="stat-label">Country Rank</span>
                    <span className="stat-value">{profile.countryRank}</span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                {profile.country && profile.country !== 'N/A' && (
                  <div className="detail-item">
                    <MapPin size={18} />
                    <span>{profile.country}</span>
                  </div>
                )}
                {profile.institution && profile.institution !== 'N/A' && (
                  <div className="detail-item">
                    <Building size={18} />
                    <span>{profile.institution}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Single profile grid with save-to-db */}
            <ProfileGrid
              data={[profile]}
              title="Profile Data Preview"
              onSaveToDb={handleSaveToDb}
              savingToDb={savingToDb}
              sections={sections}
              authAxios={authAxios}
            />
          </>
        )}
      </main>
    </div>
  );
}

function AppRouter() {
  const { user, loading, logout, authAxios } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [sections, setSections] = useState(null);

  useEffect(() => {
    if (darkMode) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
  }, [darkMode]);

  // Fetch sections for viewer
  useEffect(() => {
    if (user && user.role === 'viewer') {
      authAxios.get(`${API_BASE}/api/sections`)
        .then(res => setSections(res.data))
        .catch(() => {});
    }
  }, [user]);

  if (loading) {
    return (
      <div className="app-container dark" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (user.role === 'viewer') {
    return (
      <div className={`app-container ${darkMode ? 'dark' : ''}`}>
        <div className="top-bar">
          <div className="theme-toggle" onClick={() => { setDarkMode(!darkMode); document.body.classList.toggle('dark'); }}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </div>
          <div className="user-badge">
            <Eye size={14} />
            <span>{user.displayName || 'Viewer'}</span>
            <span className="role-tag viewer-tag">VIEWER</span>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>

        <main className="main-content">
          <div className="header">
            <h1>CodeChef Profiler</h1>
            <p>Viewer Dashboard — Explore profiles & analytics</p>
          </div>
          <ViewerDashboard sections={sections} />
        </main>
      </div>
    );
  }

  // Admin
  return <AdminDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
