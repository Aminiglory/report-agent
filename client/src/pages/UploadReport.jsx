import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import Modal from '../components/Modal';
import { useModal } from '../hooks/useModal';
import './UploadReport.css';

const UploadReport = () => {
  const [file, setFile] = useState(null);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [sectorName, setSectorName] = useState('');
  const [formatId, setFormatId] = useState('');
  const [schoolListId, setSchoolListId] = useState('');
  const [formats, setFormats] = useState([]);
  const [schoolLists, setSchoolLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSelectedRows, setPreviewSelectedRows] = useState([]);
  const { modal, showSuccess, showError, closeModal } = useModal();

  useEffect(() => {
    fetchFormats();
    fetchSchoolLists();
  }, []);

  const fetchFormats = async () => {
    try {
      const response = await axios.get('/api/formats');
      setFormats(response.data.formats?.filter(f => f.is_active) || []);
    } catch (error) {
      console.error('Error fetching formats:', error);
    }
  };

  const fetchSchoolLists = async () => {
    try {
      const response = await axios.get('/api/school-lists');
      setSchoolLists(response.data.schoolLists?.filter(l => l.is_active) || []);
    } catch (error) {
      console.error('Error fetching school lists:', error);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please upload a valid Excel file (.xlsx or .xls)');
        setFile(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setReportData(null);

    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!month) {
      setError('Please select a month');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('month', month);
    formData.append('year', year);
    if (sectorName) {
      formData.append('sectorName', sectorName);
    }
    if (formatId) {
      formData.append('formatId', formatId);
    }
    if (schoolListId) {
      formData.append('schoolListId', schoolListId);
    }

    try {
      const response = await axios.post('/api/reports/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(true);
      setReportData(response.data);
      setFile(null);
      // Reset file input
      e.target.reset();
    } catch (err) {
      console.error('Upload error details:', err);
      console.error('Response:', err.response);
      const errorMessage = err.response?.data?.error || err.message || 'Error uploading file. Please try again.';
      setError(errorMessage);
      showError(`Upload failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setError('');
    setSuccess(false);
    setReportData(null);
    setPreviewData(null);
    setPreviewSelectedRows([]);

    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!formatId) {
      setError('Please select a report format');
      return;
    }

    setPreviewLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('formatId', formatId);

    try {
      const response = await axios.post('/api/reports/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = response.data || {};
      setPreviewData(data);

      const rows = Array.isArray(data.rows) ? data.rows : [];
      const nonEmptyIndices = rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.some(cell => cell && cell.toString().trim().length > 0))
        .map(({ index }) => index);

      setPreviewSelectedRows(nonEmptyIndices);
    } catch (err) {
      console.error('Preview error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Error generating preview. Please try again.';
      setError(errorMessage);
      showError(`Preview failed: ${errorMessage}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const togglePreviewRow = (rowIndex) => {
    setPreviewSelectedRows(prev => (
      prev.includes(rowIndex)
        ? prev.filter(i => i !== rowIndex)
        : [...prev, rowIndex]
    ));
  };

  const handlePreviewSelectAll = (checked) => {
    if (!previewData || !Array.isArray(previewData.rows)) {
      setPreviewSelectedRows([]);
      return;
    }
    if (checked) {
      const allIndices = previewData.rows.map((_, index) => index);
      setPreviewSelectedRows(allIndices);
    } else {
      setPreviewSelectedRows([]);
    }
  };

  const handleGenerateFromPreview = async () => {
    if (!previewData) {
      setError('No preview data available. Please generate a preview first.');
      return;
    }

    if (!formatId) {
      setError('Please select a report format');
      return;
    }

    if (!Array.isArray(previewSelectedRows) || previewSelectedRows.length === 0) {
      setError('Please select at least one row in the preview');
      return;
    }

    const { uploadedHeaders = [], formatHeaders = [], rows = [] } = previewData;

    if (!Array.isArray(rows) || rows.length === 0) {
      setError('Preview has no rows to generate from');
      return;
    }

    const targetHeaders = (Array.isArray(formatHeaders) && formatHeaders.length > 0)
      ? formatHeaders
      : uploadedHeaders;

    if (!targetHeaders || targetHeaders.length === 0) {
      setError('No headers available from the selected format');
      return;
    }

    const normalize = (str) => {
      if (!str) return '';
      return str.toString().trim().toLowerCase().replace(/\s+/g, '');
    };

    const headerMap = new Map();
    uploadedHeaders.forEach((header, idx) => {
      const n = normalize(header);
      if (!n) return;
      const targetIndex = targetHeaders.findIndex(h => normalize(h) === n);
      if (targetIndex !== -1) {
        headerMap.set(idx, targetIndex);
      }
    });

    const mappedRows = rows.map(row => {
      const out = new Array(targetHeaders.length).fill('');
      (row || []).forEach((cell, idx) => {
        const targetIndex = headerMap.get(idx);
        if (targetIndex !== undefined && targetIndex < out.length) {
          out[targetIndex] = cell;
        }
      });
      return out;
    });

    try {
      setLoading(true);
      const response = await axios.post(
        '/api/reports/generate-from-rows',
        {
          formatId,
          rows: mappedRows,
          selectedRowIndices: previewSelectedRows,
          fileName: `Sector_Selected_Rows_${month || 'Month'}_${year || new Date().getFullYear()}`
        },
        {
          responseType: 'blob'
        }
      );

      const suggestedName = `Sector_Selected_Rows_${month || 'Month'}_${year || new Date().getFullYear()}.xlsx`;
      saveAs(response.data, suggestedName.replace(/[^a-zA-Z0-9_.-]/g, '_'));
      showSuccess('Excel generated from selected rows');
    } catch (err) {
      console.error('Error generating from preview rows:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Error generating report from selected rows.';
      setError(errorMessage);
      showError(`Generation failed: ${errorMessage}`);
    } finally {
      setLoading(false);
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

  return (
    <div className="upload-report">
      <div className="container">
        <div className="upload-header">
          <h1>Upload Sector Report</h1>
          <p>Upload your sector report to generate individual Excel files for each school</p>
        </div>

        <div className="upload-card">
          {error && <div className="error-message">{error}</div>}
          {success && (
            <div className="success-message">
              Report processed successfully! {reportData?.totalSchools} schools found.
            </div>
          )}

          <form onSubmit={handleSubmit} className="upload-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="month">Month *</label>
                <select
                  id="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  required
                >
                  <option value="">Select Month</option>
                  {months.map((m, idx) => (
                    <option key={idx} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="year">Year *</label>
                <input
                  type="number"
                  id="year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                  min="2000"
                  max="2100"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="sectorName">Sector Name (Optional)</label>
              <input
                type="text"
                id="sectorName"
                value={sectorName}
                onChange={(e) => setSectorName(e.target.value)}
                placeholder="Enter sector name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="format">Report Format *</label>
              <select
                id="format"
                value={formatId}
                onChange={(e) => setFormatId(e.target.value)}
                required
              >
                <option value="">Select Format</option>
                {formats.map((format) => (
                  <option key={format.id} value={format.id}>
                    {format.name}
                  </option>
                ))}
              </select>
              <small>
                Upload and name your format template file. This will be reused every month.
                {formats.length === 0 && (
                  <span> <a href="/formats" style={{ color: '#2563eb' }}>Create a format first</a></span>
                )}
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="schoolList">School List *</label>
              <select
                id="schoolList"
                value={schoolListId}
                onChange={(e) => setSchoolListId(e.target.value)}
                required
              >
                <option value="">Select School List</option>
                {schoolLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name} ({list.schools.length} schools)
                  </option>
                ))}
              </select>
              <small>
                Select your ordered list of schools. This order will be reused every month.
                {schoolLists.length === 0 && (
                  <span> <a href="/school-lists" style={{ color: '#2563eb' }}>Create a school list first</a></span>
                )}
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="file">Excel File *</label>
              <input
                type="file"
                id="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                required
              />
              {file && (
                <p className="file-info">Selected: {file.name}</p>
              )}
            </div>

            <button type="submit" className="upload-button" disabled={loading}>
              {loading ? 'Processing...' : 'Upload & Process Report'}
            </button>
            <button
              type="button"
              className="upload-button secondary"
              disabled={previewLoading || !file || !formatId}
              onClick={handlePreview}
              style={{ marginLeft: '0.75rem' }}
            >
              {previewLoading ? 'Generating Preview...' : 'Preview & Select Rows'}
            </button>
          </form>

          {reportData && reportData.schools && reportData.schools.length > 0 && (
            <div className="schools-list">
              <div className="download-options">
                <h3>Download Options</h3>
                <div className="download-buttons-row">
                  <button
                    onClick={() => handleDownloadCombined(reportData.reportId)}
                    className="download-button-primary"
                  >
                    📊 Download Combined Excel (All Schools)
                  </button>
                  <button
                    onClick={() => handleDownloadOriginal(reportData.reportId)}
                    className="download-button-primary"
                  >
                    📄 Download Original Sector Report
                  </button>
                </div>
              </div>

              <div className="individual-schools">
                <h3>Individual School Files ({reportData.schools.length})</h3>
                <p className="schools-subtitle">Download individual Excel files for each school</p>
                <div className="schools-grid">
                  {reportData.schools.map((school, index) => (
                    <div key={index} className="school-card">
                      <div className="school-name">{school.schoolName}</div>
                      <button
                        onClick={() => handleDownload(reportData.reportId, school.schoolName)}
                        className="download-button"
                      >
                        📥 Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {previewData && (
            <div className="preview-section">
              <h3>Sector Report Preview (Select Rows)</h3>
              <p className="preview-subtitle">
                Header row and school column are auto-detected. Adjust row selection below, then generate an Excel where each selected row becomes its own sheet.
              </p>
              <div className="preview-table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: 'nowrap' }}>
                        <input
                          type="checkbox"
                          checked={
                            Array.isArray(previewData.rows) &&
                            previewData.rows.length > 0 &&
                            previewSelectedRows.length === previewData.rows.length
                          }
                          onChange={(e) => handlePreviewSelectAll(e.target.checked)}
                        />
                        {' '}Select All
                      </th>
                      {(previewData.uploadedHeaders || []).map((header, idx) => (
                        <th
                          key={idx}
                          style={{
                            backgroundColor: (previewData.schoolColumnIndex === idx) ? '#fee2e2' : '#eff6ff',
                            fontWeight: '600'
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(previewData.rows || []).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td>
                          <input
                            type="checkbox"
                            checked={previewSelectedRows.includes(rowIndex)}
                            onChange={() => togglePreviewRow(rowIndex)}
                          />
                        </td>
                        {(row || []).map((cell, colIndex) => (
                          <td key={colIndex}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {(!previewData.rows || previewData.rows.length === 0) && (
                      <tr>
                        <td colSpan={(previewData.uploadedHeaders || []).length + 1} style={{ textAlign: 'center', padding: '1rem' }}>
                          No data rows found in this sheet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                <button
                  type="button"
                  className="upload-button"
                  disabled={loading || !previewSelectedRows.length}
                  onClick={handleGenerateFromPreview}
                >
                  {loading ? 'Generating from Selected Rows...' : 'Generate Excel from Selected Rows'}
                </button>
              </div>
            </div>
          )}
        </div>
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

export default UploadReport;

