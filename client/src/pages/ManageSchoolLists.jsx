import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import { useModal } from '../hooks/useModal';
import './ManageSchoolLists.css';

const ManageSchoolLists = () => {
  const [schoolLists, setSchoolLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const { modal, showSuccess, showError, showConfirm, showWarning, closeModal } = useModal();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    schools: [{ school_name: '', order: 1, status: '', head_teacher: { name: '', title: 'Head Teacher', telephone: '' } }]
  });

  useEffect(() => {
    fetchSchoolLists();
  }, []);

  const fetchSchoolLists = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/school-lists');
      setSchoolLists(response.data.schoolLists || []);
    } catch (error) {
      console.error('Error fetching school lists:', error);
      showError('Error loading school lists');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchool = () => {
    setFormData({
      ...formData,
        schools: [...formData.schools, { 
        school_name: '', 
        order: formData.schools.length + 1,
        status: '',
        head_teacher: { name: '', title: 'Head Teacher', telephone: '' }
      }]
    });
  };

  const handleRemoveSchool = (index) => {
    const newSchools = formData.schools.filter((_, i) => i !== index);
    // Reorder
    newSchools.forEach((school, i) => {
      school.order = i + 1;
    });
    setFormData({ ...formData, schools: newSchools });
  };

  const handleSchoolChange = (index, field, value) => {
    const newSchools = [...formData.schools];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      newSchools[index][parent][child] = value;
    } else {
      newSchools[index][field] = value;
    }
    setFormData({ ...formData, schools: newSchools });
  };

  const handleMoveSchool = (index, direction) => {
    const newSchools = [...formData.schools];
    if (direction === 'up' && index > 0) {
      [newSchools[index], newSchools[index - 1]] = [newSchools[index - 1], newSchools[index]];
    } else if (direction === 'down' && index < newSchools.length - 1) {
      [newSchools[index], newSchools[index + 1]] = [newSchools[index + 1], newSchools[index]];
    }
    // Reorder
    newSchools.forEach((school, i) => {
      school.order = i + 1;
    });
    setFormData({ ...formData, schools: newSchools });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const schoolsToSubmit = formData.schools
        .filter(s => s.school_name.trim())
        .map((s, i) => ({ ...s, order: i + 1 }));

      if (schoolsToSubmit.length === 0) {
        showWarning('Please add at least one school');
        return;
      }

      if (editingList) {
        await axios.put(`/api/school-lists/${editingList.id}`, {
          name: formData.name,
          description: formData.description,
          schools: schoolsToSubmit
        });
      } else {
        await axios.post('/api/school-lists', {
          name: formData.name,
          description: formData.description,
          schools: schoolsToSubmit
        });
      }

      setShowCreateForm(false);
      setEditingList(null);
      setFormData({
        name: '',
        description: '',
        schools: [{ school_name: '', order: 1, status: '', head_teacher: { name: '', title: 'Head Teacher', telephone: '' } }]
      });
      fetchSchoolLists();
    } catch (error) {
      showError('Error saving school list: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = (list) => {
    setEditingList(list);
      setFormData({
        name: list.name,
        description: list.description || '',
        schools: list.schools.length > 0 
        ? list.schools.sort((a, b) => a.order - b.order).map(school => ({
          ...school,
          status: school.status || '' // Don't default - let user choose
        }))
        : [{ school_name: '', order: 1, status: '', head_teacher: { name: '', title: 'Head Teacher', telephone: '' } }]
      });
    setShowCreateForm(true);
  };

  const handleDelete = async (listId) => {
    showConfirm(
      'Are you sure you want to delete this school list?',
      async () => {
        try {
          await axios.delete(`/api/school-lists/${listId}`);
          showSuccess('School list deleted successfully');
          fetchSchoolLists();
        } catch (error) {
          showError('Error deleting school list');
        }
      },
      'Delete School List',
      'Delete'
    );
  };

  const toggleActive = async (list) => {
    try {
      await axios.put(`/api/school-lists/${list.id}`, {
        is_active: !list.is_active
      });
      fetchSchoolLists();
    } catch (error) {
      showError('Error updating school list');
    }
  };

  return (
    <div className="manage-school-lists">
      <div className="container">
        <div className="page-header">
          <h1>Manage School Lists</h1>
          <p>Create and manage ordered lists of schools with head teachers</p>
          <button 
            onClick={() => {
              setShowCreateForm(true);
              setEditingList(null);
              setFormData({
                name: '',
                description: '',
                schools: [{ school_name: '', order: 1, head_teacher: { name: '', title: 'Head Teacher', telephone: '' } }]
              });
            }}
            className="create-button"
          >
            + Create New School List
          </button>
        </div>

        {showCreateForm && (
          <div className="create-form-card">
            <h2>{editingList ? 'Edit School List' : 'Create New School List'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>List Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Sector Schools 2024"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this school list..."
                  rows="2"
                />
              </div>

              <div className="schools-section">
                <div className="section-header">
                  <h3>Schools (in order)</h3>
                  <button type="button" onClick={handleAddSchool} className="add-school-btn">
                    + Add School
                  </button>
                </div>

                {formData.schools.map((school, index) => (
                  <div key={index} className="school-item-form">
                    <div className="school-order">{index + 1}</div>
                    <div className="school-fields">
                      <input
                        type="text"
                        placeholder="School Name *"
                        value={school.school_name}
                        onChange={(e) => handleSchoolChange(index, 'school_name', e.target.value)}
                        required
                        className="school-name-input"
                      />
                      <select
                        value={school.status || ''}
                        onChange={(e) => handleSchoolChange(index, 'status', e.target.value)}
                        className="school-status-select"
                        required
                      >
                        <option value="">Select Status *</option>
                        <option value="Primary">Primary</option>
                        <option value="Secondary">Secondary</option>
                        <option value="TVET">TVET</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Head Teacher Name"
                        value={school.head_teacher?.name || ''}
                        onChange={(e) => handleSchoolChange(index, 'head_teacher.name', e.target.value)}
                        className="head-teacher-input"
                      />
                      <input
                        type="text"
                        placeholder="Head Teacher Telephone"
                        value={school.head_teacher?.telephone || ''}
                        onChange={(e) => handleSchoolChange(index, 'head_teacher.telephone', e.target.value)}
                        className="head-teacher-input"
                      />
                    </div>
                    <div className="school-actions">
                      <button
                        type="button"
                        onClick={() => handleMoveSchool(index, 'up')}
                        disabled={index === 0}
                        className="move-btn"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSchool(index, 'down')}
                        disabled={index === formData.schools.length - 1}
                        className="move-btn"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSchool(index)}
                        className="remove-btn"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-button">
                  {editingList ? 'Update List' : 'Create List'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingList(null);
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
          <div className="loading">Loading school lists...</div>
        ) : schoolLists.length === 0 ? (
          <div className="empty-state">
            <p>No school lists created yet. Create your first list to get started!</p>
          </div>
        ) : (
          <div className="school-lists-grid">
            {schoolLists.map((list) => (
              <div key={list.id} className="list-card">
                <div className="list-header">
                  <div>
                    <h3>{list.name}</h3>
                    {list.description && <p className="list-description">{list.description}</p>}
                    <p className="list-meta">{list.schools.length} schools</p>
                  </div>
                  <div className="list-status">
                    <span className={`status-badge ${list.is_active ? 'active' : 'inactive'}`}>
                      {list.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className="schools-preview">
                  {list.schools.slice(0, 5).map((school, idx) => (
                    <div key={idx} className="school-preview-item">
                      <span className="school-order-small">{school.order}</span>
                      {school.status && (
                        <span className="school-status-badge" data-status={school.status}>
                          {school.status}
                        </span>
                      )}
                      <span className="school-name-small">{school.school_name}</span>
                      {school.head_teacher?.name && (
                        <span className="head-teacher-small">👤 {school.head_teacher.name}</span>
                      )}
                    </div>
                  ))}
                  {list.schools.length > 5 && (
                    <p className="more-schools">+ {list.schools.length - 5} more schools</p>
                  )}
                </div>

                <div className="list-actions">
                  <button onClick={() => handleEdit(list)} className="edit-button">
                    Edit
                  </button>
                  <button 
                    onClick={() => toggleActive(list)} 
                    className={list.is_active ? 'deactivate-button' : 'activate-button'}
                  >
                    {list.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button 
                    onClick={() => handleDelete(list.id)} 
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

export default ManageSchoolLists;

