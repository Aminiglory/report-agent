import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import Modal from '../components/Modal';
import { useModal } from '../hooks/useModal';
import './History.css';

const History = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [schools, setSchools] = useState([]);
  const { modal, showSuccess, showError, showConfirm, closeModal } = useModal();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  useEffect(() => {
    fetchReports();
  }, [selectedMonth, selectedYear]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedMonth) params.month = selectedMonth;
      if (selectedYear) params.year = selectedYear;

      const response = await axios.get('/api/history', { params });
      setReports(response.data.reports || []);
    } catch (err) {
      setError('Error fetching reports. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetails = async (reportId) => {
    try {
      const response = await axios.get(`/api/history/${reportId}`);
      setSelectedReport(response.data.report);
      setSchools(response.data.schools || []);
    } catch (err) {
      showError('Error fetching report details. Please try again.');
    }
  };

  const handleDownload = async (reportId, schoolName) => {
    try {
      const response = await axios.get(`/api/reports/download/${reportId}/${encodeURIComponent(schoolName)}`, {
        responseType: 'blob'
      });
      saveAs(response.data, `${schoolName}.xlsx`);
    } catch (err) {
      showError('Error downloading file. Please try again.');
    }
  };

  const handleDownloadCombined = async (reportId) => {
    try {
      const response = await axios.get(`/api/reports/download-combined/${reportId}`, {
        responseType: 'blob'
      });
      saveAs(response.data, `Combined_All_Schools.xlsx`);
    } catch (err) {
      showError('Error downloading combined file. Please try again.');
    }
  };

  const handleDownloadOriginal = async (reportId) => {
    try {
      const response = await axios.get(`/api/reports/download-original/${reportId}`, {
        responseType: 'blob'
      });
      saveAs(response.data, `Original_Sector_Report.xlsx`);
    } catch (err) {
      showError('Error downloading original file. Please try again.');
    }
  };

  const handleDeleteReport = async (reportId) => {
    showConfirm(
      'Are you sure you want to delete this report? This will delete the report and all associated school files. This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`/api/history/${reportId}`);
          showSuccess('Report deleted successfully');
          // Refresh the reports list
          fetchReports();
          // Clear selected report if it was the deleted one
          if (selectedReport?.id === reportId) {
            setSelectedReport(null);
            setSchools([]);
          }
        } catch (err) {
          showError('Error deleting report: ' + (err.response?.data?.error || err.message));
        }
      },
      'Delete Report',
      'Delete'
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="history">
      <div className="container">
        <div className="history-header">
          <h1>Report History</h1>
          <p>View and download your previous reports</p>
        </div>

        <div className="history-filters">
          <div className="filter-group">
            <label htmlFor="filter-month">Filter by Month:</label>
            <select
              id="filter-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">All Months</option>
              {months.map((m, idx) => (
                <option key={idx} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-year">Filter by Year:</label>
            <select
              id="filter-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <p>No reports found. Upload your first report to get started!</p>
          </div>
        ) : (
          <div className="reports-list">
            {reports.map((report) => (
              <div key={report.id} className="report-card">
                <div className="report-header">
                  <div>
                    <h3>{report.sector_name || 'Unnamed Sector'}</h3>
                    <p className="report-meta">
                      {report.month} {report.year} • {report.total_schools} schools
                    </p>
                    <p className="report-type">
                      <strong>Report Type:</strong> {report.format_name || 'No Format'}
                    </p>
                    <p className="report-date">Uploaded: {formatDate(report.created_at)}</p>
                  </div>
                  <div className="report-actions">
                    <div className="quick-downloads">
                      <button
                        onClick={() => handleDownloadCombined(report.id)}
                        className="quick-download-button"
                        title="Download all schools in one Excel file"
                      >
                        📊 Combined
                      </button>
                      <button
                        onClick={() => handleDownloadOriginal(report.id)}
                        className="quick-download-button"
                        title="Download original sector report"
                      >
                        📄 Original
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        if (selectedReport?.id === report.id) {
                          setSelectedReport(null);
                          setSchools([]);
                        } else {
                          fetchReportDetails(report.id);
                        }
                      }}
                      className="toggle-button"
                    >
                      {selectedReport?.id === report.id ? 'Hide' : 'View'} Schools
                    </button>
                    <button
                      onClick={() => handleDeleteReport(report.id)}
                      className="delete-button"
                      title="Delete this report"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {selectedReport?.id === report.id && (
                  <div className="schools-section">
                    <h4>Schools with Recorded Data ({schools.length})</h4>
                    {schools.length > 0 ? (
                      <div className="schools-grid">
                        {schools.map((school) => (
                          <div key={school.id} className="school-item">
                            <div className="school-info">
                              <span className="school-name">🏫 {school.school_name}</span>
                              <span className="school-status">✓ Data Recorded</span>
                            </div>
                            <button
                              onClick={() => handleDownload(report.id, school.school_name)}
                              className="download-button"
                            >
                              📥 Download
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-schools">No schools found for this report.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        confirmText={modal.confirmText}
      />
    </div>
  );
};

export default History;

