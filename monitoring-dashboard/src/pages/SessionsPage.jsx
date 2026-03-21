import React, { useState, useEffect, useMemo } from 'react';
import { getSessions } from '../api/monitoringApi';
import { useLocation } from 'react-router-dom';
import FilterBar from '../components/common/FilterBar';
import {
    Activity,
    CheckCircle2,
    Database,
    Clock,
    ChevronLeft,
    ChevronRight,
    Tornado,
    User,
    ClipboardList
} from 'lucide-react';

const SessionsPage = () => {
    const [sessions, setSessions] = useState([]);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({});
    const [loading, setLoading] = useState(true);
    const [highlightedId, setHighlightedId] = useState(null);
    const location = useLocation();
    const limit = 25;

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const res = await getSessions(page, 25, filters);
                setSessions(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [page, filters]);

    useEffect(() => {
        if (location.state?.sessionId) {
            setHighlightedId(location.state.sessionId);
            // Scroll to top to ensure visibility if it's in the first batch
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Clear highlight after 5 seconds
            const timer = setTimeout(() => setHighlightedId(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [location.state]);

    // Optimized single-pass metric calculation
    const metrics = useMemo(() => {
        return sessions.reduce((acc, s) => {
            acc.total++;
            if (s.status === 'IN_PROGRESS') acc.active++;
            if (s.status === 'COMPLETED') acc.completed++;
            if (s.status === 'SUBMITTED') acc.submitted++;
            return acc;
        }, { total: 0, active: 0, completed: 0, submitted: 0 });
    }, [sessions]);

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        setPage(1);
    };

    return (
        <div className="content-area" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-md)' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
                            Inspection Sessions
                        </h1>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Historical and active inspection stream
                        </p>
                    </div>
                </div>

                {/* Micro Metrics Bar */}
                <div className="defects-metric-bar">
                    <div className="defects-metric-chip">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="defects-metric-label">Total Sessions</span>
                            <Database size={14} color="var(--accent-blue)" opacity={0.8} />
                        </div>
                        <span className="defects-metric-value">{metrics.total}</span>
                    </div>
                    <div className="defects-metric-chip">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="defects-metric-label">In Progress</span>
                            <Activity size={14} color="var(--accent-amber)" opacity={0.8} />
                        </div>
                        <span className="defects-metric-value" style={{ color: 'var(--accent-amber)' }}>{metrics.active}</span>
                    </div>
                    <div className="defects-metric-chip">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="defects-metric-label">Completed</span>
                            <CheckCircle2 size={14} color="var(--accent-green)" opacity={0.8} />
                        </div>
                        <span className="defects-metric-value" style={{ color: 'var(--accent-green)' }}>{metrics.completed}</span>
                    </div>
                    <div className="defects-metric-chip">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="defects-metric-label">Submitted</span>
                            <Database size={14} color="var(--accent-teal)" opacity={0.8} />
                        </div>
                        <span className="defects-metric-value" style={{ color: 'var(--accent-teal)' }}>{metrics.submitted}</span>
                    </div>
                </div>
            </div>

            <FilterBar onFilterChange={handleFilterChange} />

            <div className="defects-glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ClipboardList size={14} color="var(--accent-blue)" />
                    <span className="section-title" style={{ margin: 0, fontSize: '11px', letterSpacing: '1px' }}>GLOBAL SESSION LOG</span>
                </div>

                <div className="table-container" style={{ overflowX: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <div className="loading-spinner" />
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>Synchronizing session stream...</span>
                        </div>
                    ) : (
                        <table className="defects-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '120px' }}>SESSION ID</th>
                                    <th style={{ width: '150px' }}>MODULE</th>
                                    <th style={{ width: '120px' }}>COACH ID</th>
                                    <th style={{ width: '160px' }}>INSPECTOR</th>
                                    <th style={{ width: '160px' }}>STATUS</th>
                                    <th style={{ textAlign: 'right', paddingRight: '2rem' }}>TIMESTAMP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((s) => (
                                    <tr 
                                        key={`${s.module_type}-${s.session_id}`}
                                        style={highlightedId === s.session_id ? { background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid var(--accent-blue)', animation: 'pulse 2s infinite' } : {}}
                                    >
                                        <td style={{ fontWeight: '700', color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
                                            SES-{s.session_id}
                                        </td>
                                        <td>
                                            <span style={{
                                                backgroundColor: (MOD_COLORS[s.module_type] || '#3b82f6') + '15',
                                                color: MOD_COLORS[s.module_type] || '#3b82f6',
                                                border: `1px solid ${(MOD_COLORS[s.module_type] || '#3b82f6')}30`,
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '10px',
                                                fontFamily: 'monospace',
                                                fontWeight: '700'
                                            }}>
                                                {s.module_type}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-primary)', fontWeight: '600', fontFamily: 'monospace' }}>
                                            {s.coach_number || `ID: ${s.coach_id}`}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <User size={12} color="var(--text-muted)" />
                                                <span style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: '600' }}>
                                                    {s.inspector_name || `ID: ${s.inspector_id}`}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`defects-badge ${s.status === 'COMPLETED' ? 'defects-badge-resolved' :
                                                    s.status === 'IN_PROGRESS' ? 'defects-badge-open' : 'defects-badge-open'
                                                }`} style={s.status === 'SUBMITTED' ? { background: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf', border: '1px solid rgba(20, 184, 166, 0.3)' } : {}}>
                                                {s.status === 'COMPLETED' ? <CheckCircle2 size={10} style={{ marginRight: '6px' }} /> : <Clock size={10} style={{ marginRight: '6px' }} />}
                                                {s.status?.replace('_', ' ')}
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'right', paddingRight: '2rem', fontWeight: '500' }}>
                                            {new Date(s.created_at).toLocaleString('en-IN', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                    </tr>
                                ))}
                                {sessions.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '5rem', textAlign: 'center' }}>
                                            <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                <Database size={32} opacity={0.2} />
                                                <span style={{ fontSize: '14px' }}>No sessions found matching your current filters.</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.01)'
                }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}>
                        BATCH #{page} | LOGGING {sessions.length} CHANNELS
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            className="defects-btn-interactive"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <ChevronLeft size={14} /> PREVIOUS
                        </button>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)', minWidth: '80px', textAlign: 'center', fontFamily: 'monospace' }}>
                            PAGE {page}
                        </span>
                        <button
                            className="defects-btn-interactive"
                            onClick={() => setPage(p => p + 1)}
                            disabled={sessions.length < limit || loading}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            NEXT BATCH <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MOD_COLORS = {
    WSP: '#10b981',
    SICKLINE: '#f59e0b',
    COMMISSIONARY: '#a855f7',
    CAI: '#3b82f6',
    PITLINE: '#14b8a6'
};

export default SessionsPage;
