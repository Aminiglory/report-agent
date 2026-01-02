import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import { useModal } from '../hooks/useModal';
import './ManageAuthorities.css';

const ManageAuthorities = () => {
  const [authority, setAuthority] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingHeadTeacher, setEditingHeadTeacher] = useState(null);
  const { modal, showSuccess, showError, closeModal } = useModal();
  const [formData, setFormData] = useState({
    inspector: { name: '', title: 'Sector Education Inspector', telephone: '' },
    secretary: { name: '', title: 'Executive Secretary of the Sector', telephone: '' },
    headTeacher: { school_name: '', name: '', title: 'Head Teacher', telephone: '', school_list_id: '' }
  });

  useEffect(() => {
    fetchAuthorities();
  }, []);

  const fetchAuthorities = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/authorities');
      setAuthority(response.data.authority);
      if (response.data.authority) {
        setFormData({
          inspector: {
            name: response.data.authority.sector_inspector?.name || '',
            title: response.data.authority.sector_inspector?.title || 'Sector Education Inspector',
            telephone: response.data.authority.sector_inspector?.telephone || ''
          },
          secretary: {
            name: response.data.authority.executive_secretary?.name || '',
            title: response.data.authority.executive_secretary?.title || 'Executive Secretary of the Sector',
            telephone: response.data.authority.executive_secretary?.telephone || ''
          },
          headTeacher: { school_name: '', name: '', title: 'Head Teacher', telephone: '', school_list_id: '' }
        });
      }
    } catch (error) {
      console.error('Error fetching authorities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInspector = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/authorities/inspector', {
        name: formData.inspector.name,
        title: formData.inspector.title,
        telephone: formData.inspector.telephone
      });
      showSuccess('Sector Inspector updated successfully');
      setEditingHeadTeacher(null);
      fetchAuthorities();
    } catch (error) {
      showError('Error updating inspector');
    }
  };

  const handleUpdateSecretary = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/authorities/secretary', {
        name: formData.secretary.name,
        title: formData.secretary.title,
        telephone: formData.secretary.telephone
      });
      showSuccess('Executive Secretary updated successfully');
      setEditingHeadTeacher(null);
      fetchAuthorities();
    } catch (error) {
      showError('Error updating secretary');
    }
  };

  const handleEditHeadTeacher = (headTeacher) => {
    if (headTeacher.type === 'inspector' || headTeacher.type === 'secretary') {
      setEditingHeadTeacher(headTeacher);
      // Form data is already set from fetchAuthorities
    } else {
      setEditingHeadTeacher(headTeacher);
      setFormData({
        ...formData,
        headTeacher: {
          school_name: headTeacher.school_name,
          name: headTeacher.name,
          title: headTeacher.title || 'Head Teacher',
          telephone: headTeacher.telephone || '',
          school_list_id: headTeacher.school_list_id || ''
        }
      });
    }
  };

  const handleUpdateHeadTeacher = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/authorities/head-teacher', {
        school_name: formData.headTeacher.school_name,
        name: formData.headTeacher.name,
        title: formData.headTeacher.title,
        telephone: formData.headTeacher.telephone,
        school_list_id: formData.headTeacher.school_list_id
      });
      showSuccess('Head Teacher updated successfully');
      setEditingHeadTeacher(null);
      setFormData({
        ...formData,
        headTeacher: { school_name: '', name: '', title: 'Head Teacher', telephone: '', school_list_id: '' }
      });
      fetchAuthorities();
    } catch (error) {
      showError('Error updating head teacher: ' + (error.response?.data?.error || error.message));
    }
  };

  const getHeadTeachers = () => {
    if (!authority?.head_teachers_from_lists) return [];
    return authority.head_teachers_from_lists;
  };

  return (
    <div className="manage-authorities">
      <div className="container">
        <div className="page-header">
          <h1>Manage Authorities</h1>
          <p>Set names for Sector Inspector, Executive Secretary, and Head Teachers</p>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="authorities-sections">
            {/* All Authorities Table */}
            <div className="authority-card">
              <div className="card-header-with-action">
                <div>
                  <h2>📋 All Authorities</h2>
                  <p className="section-description">
                    Manage Sector Inspector, Executive Secretary, and Head Teachers in one place
                  </p>
                </div>
                <div className="header-buttons">
                  {!authority?.sector_inspector?.name && (
                    <button
                      onClick={() => {
                        setEditingHeadTeacher({ type: 'inspector' });
                      }}
                      className="create-button secondary"
                    >
                      + Add Inspector
                    </button>
                  )}
                  {!authority?.executive_secretary?.name && (
                    <button
                      onClick={() => {
                        setEditingHeadTeacher({ type: 'secretary' });
                      }}
                      className="create-button secondary"
                    >
                      + Add Secretary
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingHeadTeacher({ type: 'new_head_teacher' });
                      setFormData({
                        ...formData,
                        headTeacher: { school_name: '', name: '', title: 'Head Teacher', telephone: '', school_list_id: '' }
                      });
                    }}
                    className="create-button"
                  >
                    + Add Head Teacher
                  </button>
                </div>
              </div>

              {/* Edit forms for Inspector and Secretary */}
              {(editingHeadTeacher?.type === 'inspector' || editingHeadTeacher?.type === 'secretary' || editingHeadTeacher?.type === 'new_head_teacher') && (
                <form 
                  onSubmit={editingHeadTeacher.type === 'inspector' ? handleUpdateInspector : editingHeadTeacher.type === 'secretary' ? handleUpdateSecretary : handleUpdateHeadTeacher} 
                  className="head-teacher-edit-form"
                >
                  <div className="edit-form-header">
                    <h3>
                      {editingHeadTeacher.type === 'inspector' ? 
                        (authority?.sector_inspector?.name ? 'Edit Sector Education Inspector' : 'Add Sector Education Inspector') : 
                       editingHeadTeacher.type === 'secretary' ? 
                        (authority?.executive_secretary?.name ? 'Edit Executive Secretary' : 'Add Executive Secretary') : 
                       'Add New Head Teacher'}
                    </h3>
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingHeadTeacher(null);
                        setFormData({
                          ...formData,
                          inspector: { ...formData.inspector },
                          secretary: { ...formData.secretary },
                          headTeacher: { school_name: '', name: '', title: 'Head Teacher', telephone: '', school_list_id: '' }
                        });
                      }}
                      className="cancel-edit-btn"
                    >
                      Cancel
                    </button>
                  </div>
                  {editingHeadTeacher.type === 'new_head_teacher' ? (
                    <>
                      <div className="form-row">
                        <div className="form-group">
                          <label>School Name *</label>
                          <input
                            type="text"
                            value={formData.headTeacher.school_name}
                            onChange={(e) => setFormData({
                              ...formData,
                              headTeacher: { ...formData.headTeacher, school_name: e.target.value }
                            })}
                            required
                            placeholder="Enter school name"
                          />
                        </div>
                        <div className="form-group">
                          <label>Head Teacher Name *</label>
                          <input
                            type="text"
                            value={formData.headTeacher.name}
                            onChange={(e) => setFormData({
                              ...formData,
                              headTeacher: { ...formData.headTeacher, name: e.target.value }
                            })}
                            required
                            placeholder="Enter head teacher name"
                          />
                        </div>
                        <div className="form-group">
                          <label>Title</label>
                          <input
                            type="text"
                            value={formData.headTeacher.title}
                            onChange={(e) => setFormData({
                              ...formData,
                              headTeacher: { ...formData.headTeacher, title: e.target.value }
                            })}
                            placeholder="Head Teacher"
                          />
                        </div>
                        <div className="form-group">
                          <label>Telephone</label>
                          <input
                            type="text"
                            value={formData.headTeacher.telephone}
                            onChange={(e) => setFormData({
                              ...formData,
                              headTeacher: { ...formData.headTeacher, telephone: e.target.value }
                            })}
                            placeholder="Enter telephone number"
                          />
                        </div>
                      </div>
                      <button type="submit" className="submit-button">Add Head Teacher</button>
                    </>
                  ) : (
                    <>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Name *</label>
                          <input
                            type="text"
                            value={editingHeadTeacher.type === 'inspector' ? formData.inspector.name : formData.secretary.name}
                            onChange={(e) => {
                              if (editingHeadTeacher.type === 'inspector') {
                                setFormData({
                                  ...formData,
                                  inspector: { ...formData.inspector, name: e.target.value }
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  secretary: { ...formData.secretary, name: e.target.value }
                                });
                              }
                            }}
                            required
                            placeholder="Enter name"
                          />
                        </div>
                        <div className="form-group">
                          <label>Title</label>
                          <input
                            type="text"
                            value={editingHeadTeacher.type === 'inspector' ? formData.inspector.title : formData.secretary.title}
                            onChange={(e) => {
                              if (editingHeadTeacher.type === 'inspector') {
                                setFormData({
                                  ...formData,
                                  inspector: { ...formData.inspector, title: e.target.value }
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  secretary: { ...formData.secretary, title: e.target.value }
                                });
                              }
                            }}
                            placeholder={editingHeadTeacher.type === 'inspector' ? 'Sector Education Inspector' : 'Executive Secretary of the Sector'}
                          />
                        </div>
                        <div className="form-group">
                          <label>Telephone</label>
                          <input
                            type="text"
                            value={editingHeadTeacher.type === 'inspector' ? formData.inspector.telephone : formData.secretary.telephone}
                            onChange={(e) => {
                              if (editingHeadTeacher.type === 'inspector') {
                                setFormData({
                                  ...formData,
                                  inspector: { ...formData.inspector, telephone: e.target.value }
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  secretary: { ...formData.secretary, telephone: e.target.value }
                                });
                              }
                            }}
                            placeholder="Enter telephone number"
                          />
                        </div>
                      </div>
                      <button type="submit" className="submit-button">
                        {authority?.sector_inspector?.name || authority?.executive_secretary?.name ? 'Save Changes' : 'Add Authority'}
                      </button>
                    </>
                  )}
                </form>
              )}

              {/* Authorities Table */}
              <div className="authorities-table-container">
                <table className="head-teachers-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Name</th>
                      <th>Title</th>
                      <th>Telephone</th>
                      <th>School/Details</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Sector Inspector Row */}
                    <tr>
                      <td className="role-cell">
                        <span className="role-badge inspector">📋 Inspector</span>
                      </td>
                      <td className="name-cell">{authority?.sector_inspector?.name || '-'}</td>
                      <td className="title-cell">{authority?.sector_inspector?.title || 'Sector Education Inspector'}</td>
                      <td className="telephone-cell">{authority?.sector_inspector?.telephone || '-'}</td>
                      <td className="school-cell">Sector Level</td>
                      <td className="actions-cell">
                        {authority?.sector_inspector?.name ? (
                          <button
                            onClick={() => {
                              setEditingHeadTeacher({ type: 'inspector' });
                            }}
                            className="edit-btn-small"
                            title="Edit"
                          >
                            ✏️
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingHeadTeacher({ type: 'inspector' });
                            }}
                            className="add-btn-small"
                            title="Add Inspector"
                          >
                            ➕
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* Executive Secretary Row */}
                    <tr>
                      <td className="role-cell">
                        <span className="role-badge secretary">📝 Secretary</span>
                      </td>
                      <td className="name-cell">{authority?.executive_secretary?.name || '-'}</td>
                      <td className="title-cell">{authority?.executive_secretary?.title || 'Executive Secretary of the Sector'}</td>
                      <td className="telephone-cell">{authority?.executive_secretary?.telephone || '-'}</td>
                      <td className="school-cell">Sector Level</td>
                      <td className="actions-cell">
                        {authority?.executive_secretary?.name ? (
                          <button
                            onClick={() => {
                              setEditingHeadTeacher({ type: 'secretary' });
                            }}
                            className="edit-btn-small"
                            title="Edit"
                          >
                            ✏️
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingHeadTeacher({ type: 'secretary' });
                            }}
                            className="add-btn-small"
                            title="Add Secretary"
                          >
                            ➕
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* Head Teachers Rows */}
                    {getHeadTeachers().map((ht, index) => (
                      <tr key={index}>
                        <td className="role-cell">
                          <span className="role-badge head-teacher">👨‍🏫 Head Teacher</span>
                        </td>
                        <td className="name-cell">{ht.name}</td>
                        <td className="title-cell">{ht.title}</td>
                        <td className="telephone-cell">{ht.telephone || '-'}</td>
                        <td className="school-cell">{ht.school_name}</td>
                        <td className="actions-cell">
                          <button
                            onClick={() => handleEditHeadTeacher(ht)}
                            className="edit-btn-small"
                            title="Edit"
                          >
                            ✏️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Edit form for Head Teachers (only for editing existing, not for new) */}
              {editingHeadTeacher && editingHeadTeacher.type !== 'inspector' && editingHeadTeacher.type !== 'secretary' && editingHeadTeacher.type !== 'new_head_teacher' && editingHeadTeacher.school_name && (
                <form onSubmit={handleUpdateHeadTeacher} className="head-teacher-edit-form">
                  <div className="edit-form-header">
                    <h3>Edit Head Teacher: {editingHeadTeacher.school_name}</h3>
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingHeadTeacher(null);
                        setFormData({
                          ...formData,
                          headTeacher: { school_name: '', name: '', title: 'Head Teacher', telephone: '', school_list_id: '' }
                        });
                      }}
                      className="cancel-edit-btn"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>School Name</label>
                      <input
                        type="text"
                        value={formData.headTeacher.school_name}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Head Teacher Name *</label>
                      <input
                        type="text"
                        value={formData.headTeacher.name}
                        onChange={(e) => setFormData({
                          ...formData,
                          headTeacher: { ...formData.headTeacher, name: e.target.value }
                        })}
                        required
                        placeholder="Enter head teacher name"
                      />
                    </div>
                    <div className="form-group">
                      <label>Title</label>
                      <input
                        type="text"
                        value={formData.headTeacher.title}
                        onChange={(e) => setFormData({
                          ...formData,
                          headTeacher: { ...formData.headTeacher, title: e.target.value }
                        })}
                        placeholder="Head Teacher"
                      />
                    </div>
                    <div className="form-group">
                      <label>Telephone</label>
                      <input
                        type="text"
                        value={formData.headTeacher.telephone}
                        onChange={(e) => setFormData({
                          ...formData,
                          headTeacher: { ...formData.headTeacher, telephone: e.target.value }
                        })}
                        placeholder="Enter telephone number"
                      />
                    </div>
                  </div>
                  <button type="submit" className="submit-button">Save Changes</button>
                </form>
              )}

              {getHeadTeachers().length === 0 && (
                <div className="empty-head-teachers">
                  <p>No head teachers found. Create a School List and assign head teachers to schools.</p>
                  <a href="/school-lists" className="link-button">Go to School Lists</a>
                </div>
              )}
            </div>
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

export default ManageAuthorities;
