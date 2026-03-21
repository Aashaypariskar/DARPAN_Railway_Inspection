import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser, permanentDeleteUser, resetUserPassword, getAdminMetadata } from '../api/monitoringApi';
import { useAuth } from '../context/AuthContext';

const UsersPage = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [metadata, setMetadata] = useState({ roles: [], categories: [] });
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role_id: '', category_ids: [], status: 'Active' });
    const [resetPasswordModal, setResetPasswordModal] = useState({ show: false, userId: null, password: '' });

    const itemsPerPage = 8;

    useEffect(() => {
        fetchData();
        fetchMetadata();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getUsers();
            setUsers(res.data);
        } catch (err) {
            console.error('Fetch users error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetadata = async () => {
        try {
            const res = await getAdminMetadata();
            setMetadata(res.data);
        } catch (err) {
            console.error('Fetch metadata error:', err);
        }
    };

    const handleInactivate = async (id) => {
        if (window.confirm('Are you sure you want to deactivate this user? They will no longer be able to log in.')) {
            try {
                await deleteUser(id);
                fetchData();
            } catch (err) {
                alert(err.response?.data?.error || 'Failed to deactivate user');
            }
        }
    };

    const handlePermanentDelete = async (id) => {
        if (window.confirm('Are you sure you want to move this record to DELETED status? This action is permanent and preserves the user ID for historical reports but prevents all future modifications.')) {
            try {
                await permanentDeleteUser(id);
                fetchData();
            } catch (err) {
                alert(err.response?.data?.error || 'Failed to delete user record');
            }
        }
    };

    const handleResetPassword = async () => {
        try {
            await resetUserPassword(resetPasswordModal.userId, resetPasswordModal.password);
            alert('Password reset successfully');
            setResetPasswordModal({ show: false, userId: null, password: '' });
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to reset password');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await updateUser(editingUser.id, formData);
            } else {
                await createUser(formData);
            }
            setShowModal(false);
            setEditingUser(null);
            setFormData({ name: '', email: '', password: '', role_id: '', category_ids: [], status: 'Active' });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Operation failed');
        }
    };

    const toggleCategory = (catId) => {
        setFormData(prev => {
            const exists = prev.category_ids.includes(catId);
            if (exists) {
                return { ...prev, category_ids: prev.category_ids.filter(id => id !== catId) };
            } else {
                return { ...prev, category_ids: [...prev.category_ids, catId] };
            }
        });
    };

    const openEditModal = (u) => {
        setEditingUser(u);
        setFormData({
            name: u.name,
            email: u.email,
            password: '',
            role_id: u.Role?.id || '',
            category_ids: u.CategoryMasters?.map(c => c.id) || [],
            status: u.status
        });
        setShowModal(true);
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const currentUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="users-page">
            <div className="section-title-premium">User Management</div>

            <div className="dashboard-row" style={{ marginBottom: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <input
                        type="text"
                        placeholder="Search name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.6rem 1rem',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '0.875rem'
                        }}
                    />
                </div>
                <button
                    onClick={() => {
                        setEditingUser(null);
                        setFormData({ name: '', email: '', password: '', role_id: '', category_ids: [], status: 'Active' });
                        setShowModal(true);
                    }}
                    className="pill-button pill-button-primary"
                    style={{ padding: '0.6rem 1.25rem' }}
                >
                    + CREATE USER
                </button>
            </div>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>User Details</th>
                            <th>Role</th>
                            <th>Categories</th>
                            <th>Status</th>
                            <th>Last Login</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading users...</td></tr>
                        ) : currentUsers.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No users found</td></tr>
                        ) : currentUsers.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: '700' }}>{user.name}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className={`badge ${user.Role?.role_name === 'Admin' ? 'badge-purple' : 'badge-blue'}`}>
                                        {user.Role?.role_name}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        {user.CategoryMasters?.length > 0 ? user.CategoryMasters.map(c => (
                                            <span key={c.name} style={{ fontSize: '9px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                                {c.name}
                                            </span>
                                        )) : '-'}
                                    </div>
                                </td>
                                <td>
                                    <span style={{
                                        color: user.status === 'Active' ? 'var(--success)' : user.status === 'Deleted' ? 'var(--danger)' : 'var(--text-muted)',
                                        fontWeight: '700',
                                        fontSize: '11px'
                                    }}>
                                        {user.status.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => openEditModal(user)}
                                            style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '14px', cursor: 'pointer' }}
                                            title="Edit User"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => {
                                                setResetPasswordModal({ show: true, userId: user.id, password: '' });
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--accent-amber)', fontSize: '14px', cursor: 'pointer' }}
                                            title="Reset Password"
                                        >
                                            🔑
                                        </button>
                                        {user.status === 'Active' ? (
                                            <button
                                                onClick={() => handleInactivate(user.id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '14px', cursor: 'pointer' }}
                                                title="Inactivate"
                                            >
                                                ∅
                                            </button>
                                        ) : user.status === 'Inactive' ? (
                                            <button
                                                onClick={() => handlePermanentDelete(user.id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '14px', cursor: 'pointer' }}
                                                title="Permanent Delete"
                                            >
                                                🗑️
                                            </button>
                                        ) : (
                                            <span title="Deleted - Preserved for Audit" style={{ opacity: 0.2, cursor: 'not-allowed' }}>🗑️</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                    >
                        Prev
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            style={{
                                padding: '0.4rem 0.8rem',
                                background: currentPage === i + 1 ? 'var(--accent-blue)' : 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            {i + 1}
                        </button>
                    ))}
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', border: '1px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>{editingUser ? 'Edit User' : 'Create New User'}</h2>
                        <form onSubmit={handleSubmit} autoComplete="off">
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Full Name</label>
                                <input
                                    required
                                    type="text"
                                    autoComplete="off"
                                    className="form-input"
                                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email Address</label>
                                <input
                                    required
                                    type="email"
                                    autoComplete="off"
                                    className="form-input"
                                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    disabled={!!editingUser}
                                />
                            </div>
                            {!editingUser && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Password</label>
                                    <input
                                        required
                                        type="password"
                                        autoComplete="new-password"
                                        className="form-input"
                                        style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Role</label>
                                    <select
                                        required
                                        style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                                        value={formData.role_id}
                                        onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                    >
                                        <option value="">Select Role</option>
                                        {metadata.roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
                                        {/* Only let Super Admin see Admin promotion option if needed - Backend handles enforcement */}
                                    </select>
                                </div>
                                {editingUser && (
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status</label>
                                        <select
                                            style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                            <option value="Deleted">Deleted</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assigned Categories</label>
                                <div style={{
                                    maxHeight: '150px',
                                    overflowY: 'auto',
                                    padding: '0.75rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '0.5rem'
                                }}>
                                    {metadata.categories.map(cat => (
                                        <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.category_ids.includes(cat.id)}
                                                onChange={() => toggleCategory(cat.id)}
                                                style={{ accentColor: 'var(--accent-blue)' }}
                                            />
                                            {cat.name}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'var(--accent-blue)', border: 'none', color: 'white', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    {editingUser ? 'Save Changes' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {resetPasswordModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid var(--border-color)' }}>
                        <h2 style={{ marginBottom: '1rem' }}>Reset Password</h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Enter a new password for this user.</p>
                        <input
                            type="password"
                            placeholder="New password"
                            style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', marginBottom: '1.5rem' }}
                            value={resetPasswordModal.password}
                            onChange={(e) => setResetPasswordModal({ ...resetPasswordModal, password: e.target.value })}
                        />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setResetPasswordModal({ show: false, userId: null, password: '' })} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleResetPassword} style={{ flex: 1, padding: '0.75rem', background: 'var(--accent-amber)', border: 'none', color: 'white', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Reset now</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;
