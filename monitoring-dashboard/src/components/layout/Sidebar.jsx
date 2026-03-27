import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    ListTodo,
    AlertCircle,
    BarChart3,
    Users
} from 'lucide-react';
import railwayLogo from '../../assets/DARPAN_Logo.png';

const Sidebar = () => {
    const { canManageUsers } = useAuth();

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    background: '#fff'
                }}>
                    <img src={railwayLogo} alt="Indian Railways" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
            </div>
            <nav className="sidebar-nav">
                <NavLink to="/" end title="Dashboard Overview">
                    <LayoutDashboard />
                    <span>Overview</span>
                </NavLink>
                <NavLink to="/sessions" title="Inspection Sessions">
                    <ListTodo />
                    <span>Sessions</span>
                </NavLink>
                <NavLink to="/defects" title="Deficient Modules">
                    <AlertCircle />
                    <span>Defects</span>
                </NavLink>
                <NavLink to="/reports" title="Analytical Reports">
                    <BarChart3 />
                    <span>Reports</span>
                </NavLink>
                {canManageUsers && (
                    <NavLink to="/users" title="User Management">
                        <Users />
                        <span>Users</span>
                    </NavLink>
                )}
            </nav>
        </aside>
    );
};

export default Sidebar;
