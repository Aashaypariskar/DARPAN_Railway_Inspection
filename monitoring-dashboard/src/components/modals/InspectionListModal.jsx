import React, { useState, useEffect } from 'react';
import { X, ClipboardList, User, Clock, ChevronRight, Database, Box } from 'lucide-react';
import { getSessions } from '../../api/monitoringApi';
import { useNavigate } from 'react-router-dom';

const STATUS_GROUPS = {
    FINALIZED: ["SUBMITTED", "FINALIZED", "COMPLETED"],
    ACTIVE: ["IN_PROGRESS"],
    DRAFTS: ["DRAFT"]
};

const InspectionListModal = ({ statusGroup, isOpen, onClose }) => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && statusGroup) {
            const fetchSessions = async () => {
                setLoading(true);
                try {
                    // Fetch recent sessions. Since we filter locally, we might need a decent batch.
                    const res = await getSessions(1, 100); 
                    const allSessions = res.data || [];
                    const filtered = allSessions.filter(s => 
                        STATUS_GROUPS[statusGroup]?.includes(s.status)
                    );
                    setSessions(filtered);
                } catch (err) {
                    console.error('Fetch Sessions Modal Error:', err);
                } finally {
                    setLoading(false);
                }
            };
            fetchSessions();
        }
    }, [isOpen, statusGroup]);

    if (!isOpen) return null;

    const handleView = (session) => {
        if (session.status === 'SUBMITTED' || session.status === 'FINALIZED' || session.status === 'COMPLETED') {
            navigate('/reports', { state: { reportingId: session.reporting_id } });
        } else {
            navigate('/sessions', { state: { sessionId: session.session_id } });
        }
        onClose();
    };

    const getStatusVariant = (s) => {
        switch (s) {
            case 'SUBMITTED': case 'COMPLETED': case 'FINALIZED': return 'defects-badge-resolved';
            case 'IN_PROGRESS': return 'defects-badge-open';
            case 'DRAFT': return 'defects-badge-open';
            default: return '';
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(2, 6, 17, 0.9)', backdropFilter: 'blur(12px)',
            zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', animation: 'fadeIn 0.3s ease-out'
        }}>
            <div className="defects-glass-card" style={{
                width: '100%', maxWidth: '1000px', maxHeight: '85vh',
                display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: 'rgba(59, 130, 246, 0.1)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}>
                            <ClipboardList size={18} color="var(--accent-blue)" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', letterSpacing: '-0.01em' }}>
                                {statusGroup?.replace('_', ' ')} INSPECTIONS
                            </h3>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>
                                Drill-down Result Set
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.05)', border: 'none',
                        color: 'var(--text-muted)', padding: '8px', borderRadius: '8px',
                        cursor: 'pointer', transition: 'all 0.2s'
                    }} className="hover-scale">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', minHeight: '300px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px' }}>
                            <div className="loading-spinner" />
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Filtering inspection pipeline...</span>
                        </div>
                    ) : sessions.length > 0 ? (
                        <table className="defects-table">
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#131926' }}>
                                <tr>
                                    <th style={{ paddingLeft: '24px' }}>DATE</th>
                                    <th>MODULE</th>
                                    <th>SESSION ID</th>
                                    <th>COACH / ASSET</th>
                                    <th>INSPECTOR</th>
                                    <th>STATUS</th>
                                    <th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((s, idx) => (
                                    <tr key={idx}>
                                        <td style={{ paddingLeft: '24px', fontSize: '12px' }}>
                                            {new Date(s.created_at || s.createdAt).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <span style={{
                                                background: 'rgba(255,255,255,0.05)', padding: '2px 8px',
                                                borderRadius: '4px', fontSize: '10px', fontWeight: '700',
                                                border: '1px solid rgba(255,255,255,0.1)', color: 'var(--accent-blue)'
                                            }}>{s.module_type || s.module}</span>
                                        </td>
                                        <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                            SES-{s.session_id}
                                        </td>
                                        <td style={{ fontWeight: '600', fontSize: '12px' }}>
                                            {s.coach_number || s.asset_id || s.assetLabel || 'N/A'}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                                <User size={12} color="var(--text-muted)" />
                                                {s.inspector_name || s.inspector || 'N/A'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`defects-badge ${getStatusVariant(s.status)}`}>
                                                {s.status === 'SUBMITTED' ? <Database size={10} /> : <Clock size={10} />}
                                                {s.status}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                            <button 
                                                onClick={() => handleView(s)}
                                                className="defects-btn-interactive"
                                                style={{ fontSize: '10px', padding: '6px 16px' }}
                                            >
                                                VIEW <ChevronRight size={12} style={{ marginLeft: '4px' }} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px', color: 'var(--text-muted)' }}>
                            <Box size={40} opacity={0.2} />
                            <span style={{ fontSize: '14px' }}>No inspections found for this status.</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                        {sessions.length} RECORDS MATCHED
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InspectionListModal;
