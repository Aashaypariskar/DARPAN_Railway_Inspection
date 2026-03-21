import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
    const { user, logout, canManageUsers } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Close dropdown on navigation
    useEffect(() => {
        setIsDropdownOpen(false);
    }, [location.pathname]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to log out?')) {
            logout();
        }
    };

    return (
        <header className="header" style={{ height: '52px', background: '#0b111e', padding: '0 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
            <div className="header-left">
                <span className="header-title" style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '0.5px' }}>DARPAN Inspection</span>
            </div>

            <div className="header-right" style={{ position: 'relative' }} ref={dropdownRef}>
                <div
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        transition: 'background 0.2s',
                        background: isDropdownOpen ? 'rgba(255,255,255,0.05)' : 'transparent'
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#f1f5f9', lineHeight: '1.2' }}>{user?.name || 'Admin User'}</span>
                        <span style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user?.normalizedRole || 'Administrator'}</span>
                    </div>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'var(--accent-blue)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: 'white',
                        border: '2px solid rgba(255,255,255,0.1)'
                    }}>
                        {user?.name?.[0]?.toUpperCase() || 'A'}
                    </div>
                </div>

                {isDropdownOpen && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '0.5rem',
                        width: '240px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                        zIndex: 1000,
                        overflow: 'hidden',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        {/* User Info Header */}
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>{user?.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{user?.email || 'admin@example.com'}</div>
                        </div>

                        {/* Menu Options */}
                        <div style={{ padding: '0.5rem' }}>
                            {canManageUsers && (
                                <button
                                    onClick={() => navigate('/users')}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', transition: 'all 0.2s' }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.color = 'var(--accent-blue)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                >
                                    <span style={{ fontSize: '16px' }}>👥</span> Manage Users
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/profile')}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', transition: 'all 0.2s' }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            >
                                <span style={{ fontSize: '16px' }}>👤</span> My Profile
                            </button>

                            <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.5rem 0' }}></div>

                            <button
                                onClick={handleLogout}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1rem', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', fontWeight: '700', transition: 'all 0.2s' }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'none'; }}
                            >
                                <span style={{ fontSize: '16px' }}>⎋</span> Logout
                            </button>
                        </div>
                    </div>
                )}
            </div>        </header>
    );
};

export default Header;
