import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import Modal from '../components/Modal';
import { useModal } from '../hooks/useModal';
import './ManageFormats.css';

const ManageFormats = () => {
  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFormat, setEditingFormat] = useState(null);
  const { modal, showSuccess, showError, showConfirm, closeModal } = useModal();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    school_column: '',
    data_columns: '',
    template: null
  });
  const [templateHeaders, setTemplateHeaders] = useState([]);
  const [loadingHeaders, setLoadingHeaders] = useState(false);
  const [templatePreview, setTemplatePreview] = useState([]);
  const [headerRowIndex, setHeaderRowIndex] = useState(null);
  const [selectedSchoolColumnIndex, setSelectedSchoolColumnIndex] = useState(null);

  useEffect(() => {
    fetchFormats();
  }, []);

  const fetchFormats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/formats');
      setFormats(response.data.formats || []);
    } catch (error) {
      console.error('Error fetching formats:', error);
      showError('Error loading formats');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFormat) {
        // For editing, use FormData if a new file is selected, otherwise use JSON
        if (formData.template) {
          const formDataToSend = new FormData();
          formDataToSend.append('name', formData.name);
          formDataToSend.append('description', formData.description);
          formDataToSend.append('school_column', formData.school_column);
          formDataToSend.append('data_columns', JSON.stringify([]));
          formDataToSend.append('template', formData.template);
          
          await axios.put(`/api/formats/${editingFormat.id}`, formDataToSend, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else {
          // No new file, just update the fields
          await axios.put(`/api/formats/${editingFormat.id}`, {
            name: formData.name,
            description: formData.description,
            school_column: formData.school_column
          });
        }
      } else {
        // For creating, always use FormData
        const formDataToSend = new FormData();
        formDataToSend.append('name', formData.name);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('school_column', formData.school_column);
        formDataToSend.append('data_columns', JSON.stringify([]));
        if (formData.template) {
          formDataToSend.append('template', formData.template);
        }

        await axios.post('/api/formats', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      showSuccess(editingFormat ? 'Format updated successfully' : 'Format created successfully');
      setShowCreateForm(false);
      setEditingFormat(null);
      setFormData({ name: '', description: '', school_column: '', data_columns: '', template: null });
      fetchFormats();
    } catch (error) {
      showError('Error saving format: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = (format) => {
    setEditingFormat(format);
    setFormData({
      name: format.name,
      description: format.description || '',
      school_column: format.column_mappings?.school_column || '',
      data_columns: '',
      template: null
    });
    // Load headers from existing format structure
    if (format.structure?.headers) {
      setTemplateHeaders(format.structure.headers.filter(h => h && h.length > 0));
    }
    setTemplatePreview([]);
    setHeaderRowIndex(null);
    setSelectedSchoolColumnIndex(null);
    setShowCreateForm(true);
  };

  const handleDelete = async (formatId) => {
    showConfirm(
      'Are you sure you want to delete this format?',
      async () => {
        try {
          await axios.delete(`/api/formats/${formatId}`);
          showSuccess('Format deleted successfully');
          fetchFormats();
        } catch (error) {
          showError('Error deleting format');
        }
      },
      'Delete Format',
      'Delete'
    );
  };

  const toggleActive = async (format) => {
    try {
      await axios.put(`/api/formats/${format.id}`, {
        is_active: !format.is_active
      });
      fetchFormats();
    } catch (error) {
      showError('Error updating format');
    }
  };

  return (
    <div className="manage-formats">
      <div className="container">
        <div className="page-header">
          <h1>Manage Report Formats</h1>
          <p>Create and manage report templates for different report types</p>
          <button 
            onClick={() => {
              setShowCreateForm(true);
              setEditingFormat(null);
              setFormData({ name: '', description: '', school_column: '', data_columns: '', template: null });
            }}
            className="create-button"
          >
            + Create New Format
          </button>
        </div>

        {showCreateForm && (
          <div className="create-form-card">
            <h2>{editingFormat ? 'Edit Format' : 'Create New Format'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Format Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Monthly Academic Report"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this report format..."
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Template File {!editingFormat && '*'}</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={async (e) => {
                    const file = e.target.files[0] || null;
                    setFormData({ ...formData, template: file });
                    setTemplatePreview([]);
                    setHeaderRowIndex(null);
                    setSelectedSchoolColumnIndex(null);
                    
                    // Extract headers from the uploaded file
                    if (file) {
                      setLoadingHeaders(true);
                      try {
                        const arrayBuffer = await file.arrayBuffer();
                        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];
                        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                        
                        // Find the header row - look for "S/N" as indicator of data columns
                        // Skip title/header rows before S/N
                        let headers = [];
                        let headerRowIndex = -1;
                        
                        // First, try to find the row containing "S/N"
                        for (let i = 0; i < Math.min(20, data.length); i++) {
                          const row = data[i] || [];
                          const rowText = row.map(cell => cell ? cell.toString().trim().toLowerCase() : '').join(' ');
                          // Look for S/N, SN, Serial Number, or serial number patterns
                          if (rowText.includes('s/n') || rowText.includes('sn') || 
                              rowText.includes('serial') || rowText.includes('رقم')) {
                            headers = row.map(cell => cell ? cell.toString().trim() : '');
                            headerRowIndex = i;
                            break;
                          }
                        }
                        
                        // If S/N not found, fall back to first non-empty row
                        if (headers.length === 0) {
                          for (let i = 0; i < Math.min(10, data.length); i++) {
                            const row = data[i] || [];
                            const hasText = row.some(cell => cell && cell.toString().trim().length > 0);
                            if (hasText) {
                              headers = row.map(cell => cell ? cell.toString().trim() : '');
                              headerRowIndex = i;
                              break;
                            }
                          }
                        }
                        
                        setTemplateHeaders(headers.filter(h => h && h.length > 0));
                        setTemplatePreview(data.slice(0, Math.min(6, data.length)));
                        setHeaderRowIndex(headerRowIndex >= 0 ? headerRowIndex : null);
                        
                        // Auto-select school column if it looks like a school column
                        if (headers.length > 0 && !formData.school_column) {
                          const normalizeForMatching = (str) => {
                            return str.toLowerCase().trim().replace(/\s+/g, ' ');
                          };
                          const schoolKeywords = ['school', 'مدرسة', 'اسم', 'name', 'institution'];
                          const found = headers.find(h => {
                            const normalized = normalizeForMatching(h);
                            return schoolKeywords.some(keyword => normalized.includes(keyword));
                          });
                          if (found) {
                            setFormData(prev => ({ ...prev, school_column: found }));
                            const foundIndex = headers.findIndex(h => h === found);
                            if (foundIndex !== -1) {
                              setSelectedSchoolColumnIndex(foundIndex);
                            }
                          }
                        }
                      } catch (error) {
                        console.error('Error reading template file:', error);
                        showError('Error reading template file. Please make sure it\'s a valid Excel file.');
                        setTemplateHeaders([]);
                        setTemplatePreview([]);
                        setHeaderRowIndex(null);
                        setSelectedSchoolColumnIndex(null);
                      } finally {
                        setLoadingHeaders(false);
                      }
                    } else {
                      setTemplateHeaders([]);
                      setTemplatePreview([]);
                      setHeaderRowIndex(null);
                      setSelectedSchoolColumnIndex(null);
                    }
                  }}
                  required={!editingFormat}
                  key={editingFormat?.id || 'new'} // Reset file input when switching between edit/create
                />
                <small>
                  {editingFormat 
                    ? 'Upload a new template file to replace the existing one (optional). Leave empty to keep the current file.'
                    : 'Upload your Excel format template file. This will be reused every month.'}
                </small>
                {formData.template && (
                  <p className="file-info">Selected: {formData.template.name}</p>
                )}
                {editingFormat && !formData.template && editingFormat.template_file_path && (
                  <p className="file-info existing-file">
                    Current file: {editingFormat.template_file_path.split(/[/\\]/).pop() || 'Template file exists'}
                  </p>
                )}
                {loadingHeaders && (
                  <p className="file-info">Reading template file...</p>
                )}
              </div>
              <div className="form-group">
                <label>School Column Name *</label>
                {templateHeaders.length > 0 ? (
                  <>
                    <select
                      value={formData.school_column}
                      onChange={(e) => setFormData({ ...formData, school_column: e.target.value })}
                      required
                      className="column-select"
                    >
                      <option value="">-- Select Column from Template --</option>
                      {templateHeaders.map((header, index) => (
                        <option key={index} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                    <small>
                      <strong>Select the column that contains school names</strong> from the dropdown above, or manually enter the column name below.
                    </small>
                  </>
                ) : editingFormat?.structure?.headers?.length > 0 ? (
                  <>
                    <select
                      value={formData.school_column}
                      onChange={(e) => setFormData({ ...formData, school_column: e.target.value })}
                      required
                      className="column-select"
                    >
                      <option value="">-- Select Column from Template --</option>
                      {editingFormat.structure.headers.filter(h => h && h.length > 0).map((header, index) => (
                        <option key={index} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                    <small>
                      <strong>Select the column that contains school names</strong> from the dropdown above, or manually enter the column name below.
                    </small>
                  </>
                ) : null}
                <input
                  type="text"
                  value={formData.school_column}
                  onChange={(e) => setFormData({ ...formData, school_column: e.target.value })}
                  required
                  placeholder={templateHeaders.length > 0 ? "Or type the column name manually" : "e.g., School Name, اسم المدرسة, School"}
                  className={templateHeaders.length > 0 ? "mt-1" : ""}
                />
                {templateHeaders.length === 0 && !editingFormat?.structure?.headers && (
                  <small>
                    <strong>Important:</strong> Upload the template file first to see available columns, or enter the column header name manually.
                    <br />
                    Examples: "School Name", "اسم المدرسة", "School", "Institution Name"
                  </small>
                )}
              </div>
              {templatePreview.length > 0 && (
                <div className="template-preview">
                  <p className="preview-title">Template preview (click a header cell to select the School column)</p>
                  <div className="template-preview-table-wrapper">
                    <table>
                      <tbody>
                        {templatePreview.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className={headerRowIndex !== null && rowIndex === headerRowIndex ? 'preview-header-row' : ''}
                          >
                            {row.map((cell, colIndex) => {
                              const isHeader = headerRowIndex !== null && rowIndex === headerRowIndex;
                              const isSelectedCol = isHeader && selectedSchoolColumnIndex === colIndex;
                              const className = [
                                isHeader ? 'preview-header-cell' : '',
                                isSelectedCol ? 'preview-school-col' : ''
                              ].join(' ').trim();
                              const handleClick = () => {
                                if (isHeader) {
                                  const value = cell ? cell.toString().trim() : '';
                                  setFormData(prev => ({ ...prev, school_column: value }));
                                  setSelectedSchoolColumnIndex(colIndex);
                                }
                              };
                              return (
                                <td
                                  key={colIndex}
                                  className={className}
                                  onClick={handleClick}
                                >
                                  {cell}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="submit-button">
                  {editingFormat ? 'Update Format' : 'Create Format'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingFormat(null);
                  }}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading">Loading formats...</div>
        ) : formats.length === 0 ? (
          <div className="empty-state">
            <p>No formats created yet. Create your first format to get started!</p>
          </div>
        ) : (
          <div className="formats-list">
            {formats.map((format) => (
              <div key={format.id} className="format-card">
                <div className="format-header">
                  <div>
                    <h3>{format.name}</h3>
                    {format.description && <p className="format-description">{format.description}</p>}
                    <p className="format-meta">
                      School Column: <strong>{format.column_mappings?.school_column}</strong>
                    </p>
                  </div>
                  <div className="format-status">
                    <span className={`status-badge ${format.is_active ? 'active' : 'inactive'}`}>
                      {format.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="format-actions">
                  <button onClick={() => handleEdit(format)} className="edit-button">
                    Edit
                  </button>
                  <button 
                    onClick={() => toggleActive(format)} 
                    className={format.is_active ? 'deactivate-button' : 'activate-button'}
                  >
                    {format.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button 
                    onClick={() => handleDelete(format.id)} 
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>
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

export default ManageFormats;

