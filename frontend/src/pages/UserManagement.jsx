import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { UserPlus, Trash2, Key, Shield, Edit2, X, Check, Users } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'production_manager', label: 'Production Manager' },
  { value: 'purchase_team', label: 'Purchase Team' },
  { value: 'warehouse_team', label: 'Warehouse Team' },
  { value: 'plant_head', label: 'Plant Head' },
  { value: 'ceo', label: 'CEO' },
];

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showReset, setShowReset] = useState(null);
  const [showChangePw, setShowChangePw] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'production_manager', plant_id: '', email: '' });
  const [editForm, setEditForm] = useState({});
  const [resetPw, setResetPw] = useState('');
  const [changePw, setChangePw] = useState({ current_password: '', new_password: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (isAdmin) {
        const [u, d] = await Promise.all([api.get('/users'), api.get('/dashboard')]);
        setUsers(u.data);
        setPlants(d.data.plants || []);
      }
      setLoading(false);
    } catch { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api.post('/users', { ...form, plant_id: form.plant_id || null });
      setMsg('User created successfully!');
      setShowCreate(false);
      setForm({ username: '', password: '', full_name: '', role: 'production_manager', plant_id: '', email: '' });
      loadData();
    } catch (err) { setError(err.response?.data?.error || 'Failed to create user'); }
  };

  const handleDelete = async (id, username) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${id}`);
      setMsg(`User "${username}" deleted`);
      loadData();
    } catch (err) { setError(err.response?.data?.error || 'Failed to delete'); }
  };

  const handleResetPassword = async (id) => {
    if (!resetPw || resetPw.length < 6) { setError('Password must be at least 6 characters'); return; }
    try {
      await api.post(`/users/${id}/reset-password`, { new_password: resetPw });
      setMsg('Password reset successfully!');
      setShowReset(null); setResetPw('');
    } catch (err) { setError(err.response?.data?.error || 'Failed to reset'); }
  };

  const handleChangeOwnPassword = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    if (changePw.new_password !== changePw.confirm) { setError('Passwords do not match'); return; }
    try {
      await api.post('/users/change-password', { current_password: changePw.current_password, new_password: changePw.new_password });
      setMsg('Your password has been changed!');
      setShowChangePw(false);
      setChangePw({ current_password: '', new_password: '', confirm: '' });
    } catch (err) { setError(err.response?.data?.error || 'Failed to change password'); }
  };

  const startEdit = (u) => {
    setEditingId(u.id);
    setEditForm({ full_name: u.full_name, role: u.role, plant_id: u.plant_id || '', email: u.email || '', is_active: u.is_active });
  };

  const saveEdit = async (id) => {
    try {
      await api.put(`/users/${id}`, editForm);
      setEditingId(null);
      setMsg('User updated!');
      loadData();
    } catch (err) { setError(err.response?.data?.error || 'Failed to update'); }
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      {msg && <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{msg} <X size={16} style={{cursor:'pointer'}} onClick={() => setMsg('')} /></div>}
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{error} <X size={16} style={{cursor:'pointer'}} onClick={() => setError('')} /></div>}

      {/* Change Own Password — available to everyone */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3><Key size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />My Account</h3>
          <button className="btn btn-sm" style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 6, cursor: 'pointer' }} onClick={() => setShowChangePw(!showChangePw)}>
            {showChangePw ? 'Cancel' : 'Change Password'}
          </button>
        </div>
        {showChangePw && (
          <form onSubmit={handleChangeOwnPassword} style={{ padding: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
              <label className="form-label">Current Password</label>
              <input className="form-input" type="password" value={changePw.current_password} onChange={e => setChangePw({...changePw, current_password: e.target.value})} required />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" value={changePw.new_password} onChange={e => setChangePw({...changePw, new_password: e.target.value})} required minLength={6} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" value={changePw.confirm} onChange={e => setChangePw({...changePw, confirm: e.target.value})} required />
            </div>
            <button type="submit" style={{ background: '#059669', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 6, cursor: 'pointer', height: 38 }}>Save</button>
          </form>
        )}
      </div>

      {/* Admin User Management */}
      {isAdmin && (
        <>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3><Users size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />User Management ({users.length} users)</h3>
              <button style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowCreate(!showCreate)}>
                <UserPlus size={16} /> {showCreate ? 'Cancel' : 'Create User'}
              </button>
            </div>

            {showCreate && (
              <form onSubmit={handleCreate} style={{ padding: '1rem', background: '#f8f9fb', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                  <label className="form-label">Username *</label>
                  <input className="form-input" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                  <label className="form-label">Password *</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={6} />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                  <label className="form-label">Role *</label>
                  <select className="form-input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                  <label className="form-label">Plant</label>
                  <select className="form-input" value={form.plant_id} onChange={e => setForm({...form, plant_id: e.target.value})}>
                    <option value="">All Plants</option>
                    {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <button type="submit" style={{ background: '#059669', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 6, cursor: 'pointer', height: 38 }}>Create</button>
              </form>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Role</th>
                    <th>Plant</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th style={{ width: 180 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                      <td><strong>{u.username}</strong>{u.id === currentUser?.id && <span style={{color:'#4f46e5',marginLeft:4,fontSize:11}}>(you)</span>}</td>
                      <td>{editingId === u.id ? <input className="form-input" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} style={{padding:'4px 8px'}} /> : u.full_name}</td>
                      <td>{editingId === u.id ? <select className="form-input" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} style={{padding:'4px 8px'}}>{ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select> : <span className={`badge badge-${u.role === 'admin' ? 'red' : 'blue'}`}>{ROLES.find(r => r.value === u.role)?.label || u.role}</span>}</td>
                      <td>{editingId === u.id ? <select className="form-input" value={editForm.plant_id} onChange={e => setEditForm({...editForm, plant_id: e.target.value})} style={{padding:'4px 8px'}}><option value="">All</option>{plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select> : (u.plant_name || 'All')}</td>
                      <td>{editingId === u.id ? <input className="form-input" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} style={{padding:'4px 8px'}} /> : (u.email || '—')}</td>
                      <td><span className={`badge badge-${u.is_active ? 'green' : 'red'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {editingId === u.id ? (
                            <>
                              <button onClick={() => saveEdit(u.id)} title="Save" style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}><Check size={14} /></button>
                              <button onClick={() => setEditingId(null)} title="Cancel" style={{ background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}><X size={14} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(u)} title="Edit" style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}><Edit2 size={14} /></button>
                              {showReset === u.id ? (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <input type="password" placeholder="New password" value={resetPw} onChange={e => setResetPw(e.target.value)} style={{ width: 100, padding: '4px 6px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 12 }} />
                                  <button onClick={() => handleResetPassword(u.id)} style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>Set</button>
                                  <button onClick={() => { setShowReset(null); setResetPw(''); }} style={{ background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 6px', cursor: 'pointer' }}><X size={12} /></button>
                                </div>
                              ) : (
                                <button onClick={() => setShowReset(u.id)} title="Reset Password" style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}><Key size={14} /></button>
                              )}
                              {u.id !== currentUser?.id && (
                                <button onClick={() => handleDelete(u.id, u.username)} title="Delete" style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}><Trash2 size={14} /></button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!isAdmin && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          <Shield size={48} style={{ marginBottom: '1rem', color: '#d1d5db' }} />
          <p>User management is restricted to administrators.</p>
          <p>You can change your own password using the form above.</p>
        </div>
      )}
    </div>
  );
}
