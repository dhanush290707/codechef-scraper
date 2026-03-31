import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL as API_BASE } from './config';
import {
  Filter, Download, BarChart3, X, Trophy, Globe, MapPin, Building,
  ChevronDown, ChevronLeft, ChevronRight, Users, TrendingUp, PieChart as PieChartIcon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const ITEMS_PER_PAGE = 12;

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

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

export default function ViewerDashboard({ sections }) {
  const { authAxios } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [studyYear, setStudyYear] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [sectionNumber, setSectionNumber] = useState('');
  const [searchText, setSearchText] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modal
  const [selectedUser, setSelectedUser] = useState(null);

  // Fetch profiles when filters change
  useEffect(() => {
    fetchProfiles();
  }, [studyYear, academicYear, sectionNumber]);

  const fetchProfiles = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (studyYear) params.append('studyYear', studyYear);
      if (academicYear) params.append('academicYear', academicYear);
      if (sectionNumber) params.append('sectionNumber', sectionNumber);

      const { data } = await authAxios.get(`${API_BASE}/api/profiles?${params.toString()}`);
      setProfiles(data.profiles || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load profiles');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtered + searched data
  const filtered = useMemo(() => {
    let rows = [...profiles];
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      rows = rows.filter(r =>
        (r.username || '').toLowerCase().includes(q) ||
        (r.institution || '').toLowerCase().includes(q) ||
        (r.division || '').toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      const ra = typeof a.rating === 'number' ? a.rating : -1;
      const rb = typeof b.rating === 'number' ? b.rating : -1;
      return rb - ra;
    });
    return rows;
  }, [profiles, searchText]);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [searchText, studyYear, academicYear, sectionNumber]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = filtered.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  // ── Chart Data ──
  const ratingDistribution = useMemo(() => {
    const buckets = { '0-999': 0, '1000-1399': 0, '1400-1599': 0, '1600-1799': 0, '1800+': 0 };
    filtered.forEach(p => {
      const r = typeof p.rating === 'number' ? p.rating : 0;
      if (r >= 1800) buckets['1800+']++;
      else if (r >= 1600) buckets['1600-1799']++;
      else if (r >= 1400) buckets['1400-1599']++;
      else if (r >= 1000) buckets['1000-1399']++;
      else buckets['0-999']++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [filtered]);

  const divisionBreakdown = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const div = p.division || 'Unknown';
      map[div] = (map[div] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const starDistribution = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const s = typeof p.stars === 'number' ? `${p.stars}★` : 'Unrated';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([stars, count]) => ({ stars, count }));
  }, [filtered]);

  const top10 = useMemo(() => {
    return [...filtered]
      .filter(p => typeof p.rating === 'number')
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10)
      .map(p => ({ username: p.username, rating: p.rating }));
  }, [filtered]);

  const handleDownload = async () => {
    try {
      const params = new URLSearchParams();
      if (studyYear) params.append('studyYear', studyYear);
      if (academicYear) params.append('academicYear', academicYear);
      if (sectionNumber) params.append('sectionNumber', sectionNumber);

      const response = await authAxios.get(
        `${API_BASE}/api/profiles/download?${params.toString()}`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `codechef_profiles.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download Excel file');
    }
  };

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

  // Close modal on ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSelectedUser(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="viewer-dashboard fade-in">
      {/* Section Filters */}
      <div className="viewer-filters">
        <h3><Filter size={16} /> Filter Profiles</h3>
        <div className="viewer-filter-row">
          <div className="selector-group">
            <label>Study Year</label>
            <div className="select-wrapper">
              <select value={studyYear} onChange={e => setStudyYear(e.target.value)}>
                <option value="">All Years</option>
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
              <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}>
                <option value="">All Academic Years</option>
                {(sections?.academicYears || []).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown size={14} className="select-chevron" />
            </div>
          </div>
          <div className="selector-group">
            <label>Section</label>
            <div className="select-wrapper">
              <select value={sectionNumber} onChange={e => setSectionNumber(e.target.value)}>
                <option value="">All Sections</option>
                {(sections?.sectionNumbers || []).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={14} className="select-chevron" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message fade-in">{error}</div>
      )}

      {loading ? (
        <div className="viewer-loading">
          <div className="spinner"></div>
          <span>Loading profiles...</span>
        </div>
      ) : profiles.length === 0 ? (
        <div className="viewer-empty">
          <Users size={48} />
          <h3>No profiles found</h3>
          <p>No data has been saved for the selected filters yet. Ask an admin to scrape and save data.</p>
        </div>
      ) : (
        <>
          {/* Stats Summary Bar */}
          <div className="viewer-summary">
            <div className="summary-stat">
              <Users size={20} />
              <div>
                <span className="summary-label">Total Users</span>
                <span className="summary-value">{filtered.length}</span>
              </div>
            </div>
            <div className="summary-stat">
              <TrendingUp size={20} />
              <div>
                <span className="summary-label">Avg Rating</span>
                <span className="summary-value">
                  {filtered.length > 0
                    ? Math.round(filtered.reduce((s, p) => s + (typeof p.rating === 'number' ? p.rating : 0), 0) / filtered.filter(p => typeof p.rating === 'number').length || 0)
                    : 0}
                </span>
              </div>
            </div>
            <div className="summary-stat">
              <Trophy size={20} />
              <div>
                <span className="summary-label">Top Rating</span>
                <span className="summary-value">
                  {filtered.length > 0
                    ? Math.max(...filtered.map(p => typeof p.rating === 'number' ? p.rating : 0))
                    : 0}
                </span>
              </div>
            </div>
            <button className="summary-download" onClick={handleDownload}>
              <Download size={16} />
              Download Excel
            </button>
          </div>

          {/* ── Analytics Charts ── */}
          <div className="charts-section">
            <h3><BarChart3 size={18} /> Analytics</h3>
            <div className="charts-grid">
              {/* Rating Distribution */}
              <div className="chart-card">
                <h4>Rating Distribution</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ratingDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-main)' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {ratingDistribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Division Breakdown */}
              <div className="chart-card">
                <h4>Division Breakdown</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={divisionBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {divisionBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-main)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Star Distribution */}
              <div className="chart-card">
                <h4>Star Distribution</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={starDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="stars" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-main)' }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]}>
                      {starDistribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top 10 */}
              <div className="chart-card">
                <h4>Top 10 by Rating</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={top10} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis dataKey="username" type="category" width={100} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-main)' }}
                    />
                    <Bar dataKey="rating" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Profile Cards Grid ── */}
          <div className="profile-grid-section">
            <h3 className="table-title">All Profiles</h3>
            <div className="table-controls">
              <div className="table-filter">
                <Filter size={14} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                />
                {searchText && (
                  <button className="filter-clear" onClick={() => setSearchText('')}>
                    <X size={12} />
                  </button>
                )}
              </div>
              <span className="table-count">{filtered.length} of {profiles.length} users</span>
            </div>

            <div className="card-grid">
              {paginatedData.map((row, i) => {
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

            {/* Pagination */}
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
        </>
      )}
    </div>
  );
}
