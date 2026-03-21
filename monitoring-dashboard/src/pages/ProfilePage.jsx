import React from 'react';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
    const { user } = useAuth();

    return (
        <div className="profile-page glass-card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'var(--accent-blue)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: 'white'
                }}>
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>{user?.name}</h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>{user?.email}</p>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Role</span>
                    <span style={{ fontWeight: '700', color: 'var(--accent-blue)' }}>{user?.normalizedRole}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Status</span>
                    <span style={{ fontWeight: '700', color: 'var(--success)' }}>Active</span>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
