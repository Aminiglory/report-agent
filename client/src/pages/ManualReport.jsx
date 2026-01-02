import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import './ManualReport.css';

const ManualReport = () => {
  const [formats, setFormats] = useState([]);
  const [loadingFormats, setLoadingFormats] = useState(true);
  const [selectedFormatId, setSelectedFormatId] = useState('');
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [selectedRowIndices, setSelectedRowIndices] = useState([]);
  const [aiAssistEnabled, setAiAssistEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchFormats = async () => {
      try {
        setLoadingFormats(true);
        const response = await axios.get('/api/formats');
        const activeFormats = (response.data.formats || []).filter(f => f.is_active);
        setFormats(activeFormats);
      } catch (err) {
        console.error('Error fetching formats:', err);
      } finally {
        setLoadingFormats(false);
      }
    };

    fetchFormats();
  }, []);

  const headers = selectedFormat?.structure?.headers?.filter(h => h && h.toString().trim().length > 0) || [];

  // Initialize rows whenever headers change and there are no existing rows
  useEffect(() => {
    if (headers.length > 0 && rows.length === 0) {
      setRows([new Array(headers.length).fill('')]);
    }
  }, [headers.length]);

  const handleFormatChange = (e) => {
    const id = e.target.value;
    setSelectedFormatId(id);
    setSelectedRowIndices([]);
    setRows([]);
    setSuccessMessage('');
    setError('');

    const format = formats.find(f => f.id === id);
    setSelectedFormat(format || null);
  };

  const ensureRowLength = (row) => {
    if (!Array.isArray(row)) return new Array(headers.length).fill('');
    if (row.length >= headers.length) {
      return row.slice(0, headers.length);
    }
    return row.concat(new Array(headers.length - row.length).fill(''));
  };

  const getLastNonEmptyForColumn = (colIndex) => {
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const value = rows[i]?.[colIndex];
      if (value !== undefined && value !== null && value.toString().trim() !== '') {
        return value;
      }
    }
    return '';
  };

  const handleAddRow = () => {
    const baseRow = headers.map((_, colIndex) => (
      aiAssistEnabled ? getLastNonEmptyForColumn(colIndex) : ''
    ));
    setRows(prev => [...prev.map(ensureRowLength), ensureRowLength(baseRow)]);
  };

  const handleRemoveRow = (index) => {
    setRows(prev => prev.filter((_, i) => i !== index));
    setSelectedRowIndices(prev => prev.filter(i => i !== index).map(i => (i > index ? i - 1 : i)));
  };

  const handleCellChange = (rowIndex, colIndex, value) => {
    setRows(prev => {
      const next = prev.map(ensureRowLength);
      if (!next[rowIndex]) {
        next[rowIndex] = new Array(headers.length).fill('');
      }
      next[rowIndex][colIndex] = value;
      return next;
    });
  };

  const toggleRowSelected = (index) => {
    setSelectedRowIndices(prev => (
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    ));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRowIndices(rows.map((_, index) => index));
    } else {
      setSelectedRowIndices([]);
    }
  };

  const handleGenerate = async () => {
    setError('');
    setSuccessMessage('');

    if (!selectedFormatId) {
      setError('Please select a format');
      return;
    }

    if (headers.length === 0) {
      setError('Selected format does not have headers defined');
      return;
    }

    if (rows.length === 0) {
      setError('Please add at least one row');
      return;
    }

    // If no rows are explicitly selected, fall back to all non-empty rows
    let indices = selectedRowIndices;
    if (indices.length === 0) {
      indices = rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.some(cell => cell && cell.toString().trim().length > 0))
        .map(({ index }) => index);
    }

    if (indices.length === 0) {
      setError('No rows selected and no non-empty rows found');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post(
        '/api/reports/generate-from-rows',
        {
          formatId: selectedFormatId,
          rows,
          selectedRowIndices: indices,
          fileName: fileName || 'Manual_Report'
        },
        {
          responseType: 'blob'
        }
      );

      const suggestedName = (fileName || 'Manual_Report').replace(/[^a-zA-Z0-9_]/g, '_') + '.xlsx';
      saveAs(response.data, suggestedName);
      setSuccessMessage('Report generated and download started');
    } catch (err) {
      console.error('Error generating manual report:', err);
      const message = err.response?.data?.error || err.message || 'Error generating report';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="manual-report">
      <div className="container">
        <div className="page-header">
          <h1>Manual Report Builder</h1>
          <p>Create a report file by selecting a format and entering data manually</p>
        </div>

        <div className="manual-card">
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          <div className="manual-form">
            <div className="form-row">
              <div className="form-group">
                <label>Manual File Name</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g., Manual_April_Report"
                />
                <small>If empty, the name will default to Manual_Report.xlsx</small>
              </div>

              <div className="form-group">
                <label>Report Format *</label>
                <select
                  value={selectedFormatId}
                  onChange={handleFormatChange}
                  disabled={loadingFormats}
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
                  Choose one of your existing formats. Its headers will define the table columns below.
                </small>
              </div>
            </div>

            <div className="form-row options-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={aiAssistEnabled}
                  onChange={(e) => setAiAssistEnabled(e.target.checked)}
                />
                Enable smart autofill for new rows (copy patterns from previous rows)
              </label>
            </div>
          </div>

          {selectedFormat && headers.length > 0 && (
            <div className="table-section">
              <div className="table-header-row">
                <div className="table-actions-left">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleAddRow}
                  >
                    + Add Row
                  </button>
                </div>
                <div className="table-actions-right">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedRowIndices.length === rows.length && rows.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                    Select all rows
                  </label>
                </div>
              </div>

              <div className="manual-table-wrapper">
                <table className="manual-table">
                  <thead>
                    <tr>
                      <th className="select-col">Select</th>
                      {headers.map((header, colIndex) => (
                        <th key={colIndex}>{header}</th>
                      ))}
                      <th className="actions-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className="select-col">
                          <input
                            type="checkbox"
                            checked={selectedRowIndices.includes(rowIndex)}
                            onChange={() => toggleRowSelected(rowIndex)}
                          />
                        </td>
                        {headers.map((_, colIndex) => (
                          <td key={colIndex}>
                            <input
                              type="text"
                              value={ensureRowLength(row)[colIndex] || ''}
                              onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                            />
                          </td>
                        ))}
                        <td className="actions-col">
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => handleRemoveRow(rowIndex)}
                            disabled={rows.length <= 1}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={headers.length + 2} className="empty-table">
                          No rows yet. Click "+ Add Row" to start.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-footer-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleGenerate}
                  disabled={submitting || !selectedFormatId}
                >
                  {submitting ? 'Generating...' : 'Generate Excel from Selected Rows'}
                </button>
              </div>
            </div>
          )}

          {!selectedFormat && !loadingFormats && (
            <div className="empty-state">
              <p>Select a format above to start entering data manually.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManualReport;
