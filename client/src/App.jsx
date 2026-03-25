import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Search, Trophy, Globe, MapPin, Building, History, Moon, Sun, Download, Upload, FileSpreadsheet, ChevronDown, ChevronUp, X, Filter } from 'lucide-react';
import './index.css';
import { API_BASE_URL as API_BASE } from './config';

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

// Star color based on CodeChef rating
function getStarColor(stars) {
  const n = typeof stars === 'number' ? stars : 0;
  if (n >= 7) return '#e74c3c';   // red
  if (n >= 6) return '#e67e22';   // orange
  if (n >= 5) return '#9b59b6';   // purple
  if (n >= 4) return '#3498db';   // blue
  if (n >= 3) return '#2ecc71';   // green
  if (n >= 2) return '#27ae60';   // dark green
  if (n >= 1) return '#95a5a6';   // grey
  return '#bdc3c7';
}

function ProfileGrid({ data, title }) {
  const [filterText, setFilterText] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const filtered = useMemo(() => {
    let rows = [...data];
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      rows = rows.filter(r =>
        TABLE_COLUMNS.some(c => String(r[c.key] ?? '').toLowerCase().includes(q))
      );
    }
    // Sort by rating descending by default
    rows.sort((a, b) => {
      const ra = typeof a.rating === 'number' ? a.rating : -1;
      const rb = typeof b.rating === 'number' ? b.rating : -1;
      return rb - ra;
    });
    return rows;
  }, [data, filterText]);

  // Close modal on ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSelectedUser(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
        {filtered.map((row, i) => {
          const starCount = parseInt(row.stars) || 0;
          const starColor = getStarColor(starCount);
          return (
            <div
              key={i}
              className="user-card"
              onClick={() => setSelectedUser(row)}
            >
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

function App() {
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  
  // Bulk upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadError, setUploadError] = useState('');
  const [bulkJobId, setBulkJobId] = useState(null);
  const [bulkData, setBulkData] = useState([]);

  // Preview / dynamic selection state
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
  }, []);

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
      const response = await axios.get(`${API_BASE}/api/codechef/${profile.username}/excel`, {
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

  // Step 1: When user selects a file, call preview API
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
      const { data } = await axios.post(`${API_BASE}/api/codechef/bulk-excel/preview`, formData);

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

  // Fetch bulk job results for table preview
  const fetchBulkData = async (jobId) => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/codechef/job/${jobId}/data`);
      console.log('[Bulk] API response:', data);
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

  // Step 2: Submit for processing
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
      const { data } = await axios.post(`${API_BASE}/api/codechef/bulk-excel`, formData);
      
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
          // Fetch data for table preview instead of auto-downloading
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
      <div className="theme-toggle" onClick={toggleDarkMode}>
        {darkMode ? <Sun size={24} /> : <Moon size={24} />}
      </div>
      
      <main className="main-content">
        <div className="header">
          <h1>CodeChef Profiler</h1>
          <p>Get instant insights into any CodeChef user</p>
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

        {/* ── Bulk Upload Section ── */}
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
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          )}

          {uploadStatus === 'complete' && (
            <div className="bulk-complete-section fade-in">
              <div className="success-toast" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                ✅ Bulk processing complete! Preview the data below, then download.
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

        {/* Bulk data table preview */}
        {bulkData.length > 0 && (
          <ProfileGrid data={bulkData} title={`Bulk Results (${bulkData.length} users)`} />
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
          <div className="error-message">
            {error}
          </div>
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

            {/* Single profile table preview */}
            <ProfileGrid data={[profile]} title="Profile Data Preview" />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
