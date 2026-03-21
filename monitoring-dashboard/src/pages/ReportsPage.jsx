import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import {
    getReportSummary,
    getInspectorReport,
    getAgingReport,
    getRepeatedReport,
    exportReport,
    exportReportCSV,
    exportReportExcel,
    getSessionReport,
    exportSessionPDF,
    getRecentSessions,
    getSessionDefects
} from '../api/reportsApi';
import SessionDefectsModal from '../components/modals/SessionDefectsModal';
import { getUsers as getInspectors } from '../api/monitoringApi';
import { useAuth } from '../context/AuthContext';
import { getServerBaseUrl, buildImageUrl } from '../utils/urlHelper';
import {
    LayoutDashboard,
    UserCheck,
    Clock,
    RefreshCcw,
    FileText,
    Download,
    Calendar,
    Filter,
    Search,
    Database,
    ChevronLeft,
    ChevronRight,
    Users,
    Box,
    CheckCircle2
} from 'lucide-react';

const TABS = [
    { id: 'SUMMARY', label: 'Summary', icon: LayoutDashboard },
    { id: 'INSPECTORS', label: 'Inspectors', icon: UserCheck },
    { id: 'AGING', label: 'Defect Aging', icon: Clock },
    { id: 'REPEATED', label: 'Repeated Defects', icon: RefreshCcw },
    { id: 'SESSION_DETAILS', label: 'Inspection Reports', icon: FileText }
];

const TableHeader = ({ tab, type }) => {
    switch (tab) {
        case 'INSPECTORS':
            return (
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>INSPECTOR NAME</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>TOTAL SESSIONS</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>COMPLETED</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>AVG COMPLIANCE</th>
                </tr>
            );
        case 'AGING':
            return (
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>MODULE</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>DEFECT ID</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>DETECTED AT</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>AGE (DAYS)</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>STATUS</th>
                </tr>
            );
        case 'REPEATED':
            return (
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>COACH ID</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>DEFICIENCY TYPE</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>OCCURRENCES</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>LAST OBSERVED</th>
                </tr>
            );
        case 'SESSION_DETAILS':
            return (
                <tr style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)' }}>
                    {type === 'history' ? (
                        <>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>DATE</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>MODULE</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>SESSION ID</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>ASSET / COACH</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>INSPECTOR</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>STATUS</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>ACTION</th>
                        </>
                    ) : null}
                </tr>
            );
        default: return null;
    }
};

const renderTableRow = (tab, row, idx) => {
    switch (tab) {
        case 'INSPECTORS':
            return (
                <tr key={`insp-${row.inspector_name || idx}`}>
                    <td style={{ fontWeight: '600' }}>{row.inspector_name}</td>
                    <td>{row.sessions_count} Sessions</td>
                    <td><span className="dashboard-badge dashboard-badge-green">
                        <CheckCircle2 size={10} style={{ marginRight: '6px' }} /> {row.completed_count} FIXED
                    </span></td>
                    <td style={{ fontWeight: '800', color: 'var(--accent-blue)', fontFamily: 'monospace' }}>{Number(row.avg_compliance || 0).toFixed(1)}%</td>
                </tr>
            );
        case 'AGING':
            return (
                <tr key={`aging-${row.defect_id || idx}`}>
                    <td>
                        <span style={{
                            background: 'rgba(255,255,255,0.05)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            {row.module_type}
                        </span>
                    </td>
                    <td style={{ color: 'var(--accent-blue)', fontWeight: '700', fontFamily: 'monospace' }}>DEF-{row.defect_id}</td>
                    <td>{new Date(row.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontWeight: '700', color: row.age_days > 5 ? 'var(--danger)' : 'var(--accent-green)' }}>{row.age_days} DAYS</td>
                    <td>
                        <div className={`dashboard-badge ${row.resolved ? 'dashboard-badge-blue' : 'dashboard-badge-amber'}`}>
                            {row.resolved ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                            {row.resolved ? 'RESOLVED' : 'PENDING'}
                        </div>
                    </td>
                </tr>
            );
        case 'REPEATED':
            return (
                <tr key={`rep-${row.coach_number || idx}`}>
                    <td style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Box size={14} color="var(--accent-blue)" /> {row.coach_number}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.question_text_snapshot}</td>
                    <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '900', color: 'var(--danger)', fontSize: '14px' }}>{row.occurrence_count}</span>
                            <span style={{ fontSize: '9px', fontWeight: '700', opacity: 0.6 }}>RECURRENCES</span>
                        </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(row.last_seen).toLocaleDateString()}</td>
                </tr>
            );
        case 'SESSION_DETAILS':
            if (row.session_id) { // History row
                return (
                    <tr key={`sess-${row.session_id}`}>
                        <td style={{ fontWeight: '500' }}>{new Date(row.createdAt).toLocaleDateString()}</td>
                        <td>
                            <span style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '700',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                {row.module_type}
                            </span>
                        </td>
                        <td style={{ color: 'var(--accent-blue)', fontWeight: '700', fontFamily: 'monospace' }}>SES-{row.session_id}</td>
                        <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{row.asset_id}</td>
                        <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={12} color="var(--text-muted)" />
                                <span>{row.inspector_name}</span>
                            </div>
                        </td>
                        <td>
                            <div className={`dashboard-badge ${row.status === 'FINALIZED' || row.status === 'COMPLETED' ? 'dashboard-badge-green' :
                                row.status === 'SUBMITTED' ? 'dashboard-badge-blue' :
                                    row.status === 'IN_PROGRESS' ? 'dashboard-badge-amber' :
                                        'dashboard-badge-gray'
                                }`}>
                                {row.status === 'FINALIZED' || row.status === 'COMPLETED' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                {row.status}
                            </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                            <button 
                                onClick={() => idx(row.reporting_id || row.session_id)} 
                                className="dashboard-btn dashboard-btn-secondary" 
                                style={{ padding: '6px 12px', fontSize: '10px' }}
                            >
                                VIEW
                            </button>
                        </td>
                    </tr>
                );
            }
            return null;
        default: return null;
    }
};

const renderSummaryCards = (data) => {
    if (!data || data.length === 0) return (
        <div className="dashboard-metric-bar">
            {['Total Inspections', 'Completed', 'Open Defects', 'Avg Resolution'].map(label => (
                <div key={label} className="dashboard-metric-chip">
                    <span className="dashboard-metric-label">{label}</span>
                    <span className="dashboard-metric-value">0</span>
                </div>
            ))}
        </div>
    );

    const summary = data[0] || {};
    const cards = [
        { label: 'Total Inspections', value: summary.total_inspections || 0, icon: LayoutDashboard, color: 'var(--accent-blue)' },
        { label: 'Completed', value: summary.completed_inspections || 0, icon: CheckCircle2, color: 'var(--accent-green)' },
        { label: 'Open Defects', value: summary.active_defects || 0, icon: Filter, color: 'var(--danger)' },
        { label: 'Avg Resolution', value: '2.4 Days', icon: Clock, color: 'var(--accent-teal)' }
    ];

    return (
        <div className="dashboard-metric-bar">
            {cards.map((card) => (
                <div key={card.label} className="dashboard-metric-chip">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="dashboard-metric-label">{card.label}</span>
                        <card.icon size={14} color={card.color} opacity={0.6} />
                    </div>
                    <span className="dashboard-metric-value" style={{ color: card.value > 0 && card.label === 'Open Defects' ? 'var(--danger)' : 'inherit' }}>
                        {card.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

const getRemark = (item) => item.remark || item.remarks || '';
const getReasons = (item) => {
    if (Array.isArray(item.reasons)) return item.reasons.join(', ');
    if (typeof item.reasons === 'string') {
        try {
            const parsed = JSON.parse(item.reasons);
            if (Array.isArray(parsed)) return parsed.join(', ');
        } catch (e) {}
    }
    return item.reasons || item.reason || '-';
};

const renderSessionDetail = (sessionReport, onBack, onOpenDefects) => {
    if (!sessionReport) return null;

    return (
        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div className="dashboard-glass-card" style={{ marginBottom: 'var(--space-md)', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-blue)' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <h2 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em', margin: 0 }}>
                                <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>SESSION</span> SES-{sessionReport.sessionInfo.sessionId}
                            </h2>
                            <span style={{
                                background: 'rgba(59, 130, 246, 0.15)',
                                color: 'var(--accent-blue)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                padding: '4px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '700'
                            }}>
                                {sessionReport.sessionInfo.module}
                            </span>
                            <div className={`dashboard-badge ${sessionReport.sessionInfo.status === 'FINALIZED' ? 'dashboard-badge-green' :
                                sessionReport.sessionInfo.status === 'SUBMITTED' ? 'dashboard-badge-blue' :
                                    sessionReport.sessionInfo.status === 'IN_PROGRESS' ? 'dashboard-badge-amber' :
                                        'dashboard-badge-gray'
                                }`}>
                                {sessionReport.sessionInfo.status}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                <Users size={12} /> {sessionReport.sessionInfo?.inspector || 'N/A'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                <Box size={12} /> ASSET {sessionReport.sessionInfo?.assetOrCoach || 'N/A'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                <Calendar size={12} /> {sessionReport.sessionInfo?.inspectionDate ? new Date(sessionReport.sessionInfo.inspectionDate).toLocaleString() : 'N/A'}
                            </div>
                        </div>
                    </div>
                    <button onClick={onBack} className="dashboard-btn dashboard-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ChevronLeft size={14} /> BACK TO ARCHIVE
                    </button>
                </div>

                <div className="dashboard-metric-bar" style={{ marginTop: '24px' }}>
                    <div className="dashboard-metric-chip" style={{ background: 'transparent', border: 'none', padding: '0 20px', borderRight: '1px solid var(--border-color)', borderRadius: 0 }}>
                        <span className="dashboard-metric-label">Questions</span>
                        <span className="dashboard-metric-value" style={{ fontSize: '24px' }}>{sessionReport.summary?.totalQuestions ?? 0}</span>
                    </div>
                    <div 
                        className="dashboard-metric-chip" 
                        onClick={onOpenDefects}
                        style={{ 
                            background: 'rgba(239, 68, 68, 0.05)', 
                            border: '1px solid rgba(239, 68, 68, 0.1)', 
                            padding: '0 20px', 
                            borderRight: '1px solid var(--border-color)', 
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span className="dashboard-metric-label">Defects</span>
                        <span className="dashboard-metric-value" style={{ fontSize: '24px', color: 'var(--danger)' }}>{sessionReport.summary?.deficiencyCount ?? 0}</span>
                    </div>
                    <div className="dashboard-metric-chip" style={{ background: 'transparent', border: 'none', padding: '0 20px', borderRadius: 0 }}>
                        <span className="dashboard-metric-label">Progress</span>
                        <span className="dashboard-metric-value" style={{ fontSize: '24px', color: 'var(--accent-blue)' }}>
                            {sessionReport.summary?.progressPercentage ?? 0}%
                        </span>
                    </div>
                </div>
            </div>

            {(sessionReport.sections || []).map((section, sIdx) => (
                <div key={sIdx} style={{ marginBottom: '32px' }}>
                    {/* Area Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '0 8px' }}>
                        <div style={{ width: '4px', height: '16px', background: 'var(--accent-blue)', borderRadius: '2px' }}></div>
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', color: '#fff' }}>{section.title}</h3>
                    </div>

                    {(section.activities || []).map((activity, aIdx) => (
                        <div key={`${sIdx}-${aIdx}`} style={{ marginBottom: '24px', marginLeft: '12px' }}>
                            {/* Activity Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                                <div style={{ width: '3px', height: '12px', background: 'var(--text-muted)', borderRadius: '1px' }}></div>
                                <h4 style={{ margin: 0, fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{activity.title}</h4>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {activity.questions.map((q, qIdx) => {
                                    const photoUrl = q.beforeImage || q.before_photo_url || q.photoUrl || q.photo_url;
                                    const afterPhotoUrl = q.afterImage || q.after_photo_url || q.afterPhotoUrl || q.after_photo_url;
                                    const formattedReasons = getReasons(q);
                                    const remarkText = getRemark(q);

                                    return (
                                        <div key={q.id || qIdx} className="dashboard-glass-card" style={{ padding: '20px', background: q.status === 'OK' ? 'rgba(16, 185, 129, 0.03)' : 'rgba(239, 68, 68, 0.03)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '24px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff', lineHeight: '1.5' }}>{q.questionText}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                                                        <div className={`dashboard-badge ${q.status === 'OK' ? 'dashboard-badge-green' : 'dashboard-badge-amber'}`}>
                                                            {q.status === 'OK' ? <CheckCircle2 size={10} /> : <Box size={10} />}
                                                            {q.status}
                                                        </div>
                                                        {q.resolved && (
                                                            <div className="dashboard-badge dashboard-badge-blue">
                                                                <CheckCircle2 size={10} /> RESOLVED
                                                            </div>
                                                        )}
                                                        {q.updatedAt && (
                                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                                                <Clock size={10} style={{ marginRight: '4px' }} />
                                                                {new Date(q.updatedAt).toLocaleTimeString()}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
                                                        {formattedReasons && (
                                                            <div style={{ flex: 1 }}>
                                                                <span style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '10px', display: 'block', marginBottom: '4px' }}>REASONS</span>
                                                                <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formattedReasons}</span>
                                                            </div>
                                                        )}
                                                        {remarkText && (
                                                            <div style={{ flex: 1 }}>
                                                                <span style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '10px', display: 'block', marginBottom: '4px' }}>AUDITOR REMARKS</span>
                                                                <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{remarkText}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    {photoUrl && (
                                                        <div style={{ textAlign: 'center' }}>
                                                            <img
                                                                src={buildImageUrl(photoUrl)}
                                                                alt="Before"
                                                                style={{ width: '140px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                                                            />
                                                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: '800' }}>BEFORE</div>
                                                        </div>
                                                    )}
                                                    {afterPhotoUrl && (
                                                        <div style={{ textAlign: 'center' }}>
                                                            <img
                                                                src={buildImageUrl(afterPhotoUrl)}
                                                                alt="After"
                                                                style={{ width: '140px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--accent-blue)' }}
                                                            />
                                                            <div style={{ fontSize: '9px', color: 'var(--accent-blue)', marginTop: '6px', fontWeight: '800' }}>AFTER (FIXED)</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

const ReportsHeader = ({ activeTab, filters }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '0 4px' }}>
        <div>
            <h1 className="header-title" style={{ fontSize: '1.8rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
                REPORTING CONSOLE
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px', letterSpacing: '1px' }}>
                <Box size={12} color="var(--accent-blue)" />
                {activeTab === 'SESSION_DETAILS' ? 'AUDIT TRAIL & INSPECTION ARCHIVE' : `INSIGHTS ENGINE | ${filters.fromDate} — ${filters.toDate}`}
            </div>
        </div>
    </div>
);

const ReportsFilterBar = ({ filters, handleFilterChange, inspectors, activeTab, searchSessionId, setSearchSessionId, handleGenerate, handleFetchSession, handleExport, sessionReport }) => (
    <div className="dashboard-glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={14} color="var(--accent-blue)" />
                <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1px', color: 'var(--text-muted)' }}>DATA FILTERS</span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
                {sessionReport ? (
                    <>
                        <button
                            onClick={() => handleExport('download')}
                            className="dashboard-btn dashboard-btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Download size={14} /> DOWNLOAD
                        </button>
                        <button
                            onClick={() => handleExport('inline')}
                            className="dashboard-btn dashboard-btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <FileText size={14} /> EXPORT
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => handleExport('csv')}
                            className="dashboard-btn dashboard-btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Download size={14} /> EXPORT CSV
                        </button>
                        <button
                            onClick={() => handleExport('xlsx')}
                            className="dashboard-btn dashboard-btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Database size={14} /> EXPORT EXCEL
                        </button>
                    </>
                )}
            </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800' }}>
                    <Calendar size={12} /> START DATE
                </label>
                <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className="dashboard-input" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800' }}>
                    <Calendar size={12} /> END DATE
                </label>
                <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} className="dashboard-input" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800' }}>
                    <Box size={12} /> MODULE
                </label>
                <select name="moduleType" value={filters.moduleType} onChange={handleFilterChange} className="dashboard-input" style={{ minWidth: '150px' }}>
                    <option value="ALL">All Modules</option>
                    <option value="PITLINE">Pitline</option>
                    <option value="WSP">WSP</option>
                    <option value="SICKLINE">Sickline</option>
                    <option value="COMMISSIONARY">Commissionary</option>
                    <option value="CAI">CAI</option>
                </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800' }}>
                    <Users size={12} /> INSPECTOR
                </label>
                <select name="instructorId" value={filters.inspectorId} onChange={handleFilterChange} className="dashboard-input" style={{ minWidth: '150px' }}>
                    <option value="">All Inspectors</option>
                    {inspectors.map(ins => (
                        <option key={ins.emp_id} value={ins.emp_id}>{ins.name}</option>
                    ))}
                </select>
            </div>
            <button onClick={() => handleGenerate(1)} className="dashboard-btn dashboard-btn-primary" style={{ padding: '10px 32px' }}>
                GENERATE
            </button>

            {activeTab === 'SESSION_DETAILS' && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800' }}>
                            <Search size={12} /> QUICK SEARCH
                        </label>
                        <input
                            placeholder="Session ID"
                            value={searchSessionId}
                            onChange={(e) => setSearchSessionId(e.target.value)}
                            className="dashboard-input"
                            style={{ width: '120px' }}
                        />
                    </div>
                    <button onClick={() => handleFetchSession()} className="dashboard-btn dashboard-btn-primary">FETCH</button>
                </div>
            )}
        </div>
    </div>
);

const initialReportsState = {
    loading: false,
    data: [],
    pagination: { page: 1, total: 0, totalPages: 1 },
    sessionReport: null,
    showDefectsModal: false,
    searchSessionId: '',
    filters: {
        fromDate: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        moduleType: 'ALL',
        inspectorId: ''
    }
};

const reportsReducer = (state, action) => {
    switch (action.type) {
        case 'UPDATE':
            return { ...state, ...action.payload };
        default: return state;
    }
};

const ReportsPage = ({ defaultTab = 'SUMMARY' }) => {
    const { user } = useAuth();
    const location = useLocation();
    const [selectedTab, setSelectedTab] = React.useState(defaultTab);
    const activeTab = selectedTab;

    // Direct synchronization on prop change.
    const [prevDefaultTab, setPrevDefaultTab] = React.useState(defaultTab);
    if (defaultTab !== prevDefaultTab) {
        setPrevDefaultTab(defaultTab);
        setSelectedTab(defaultTab);
    }

    const [state, dispatch] = React.useReducer(reportsReducer, initialReportsState);
    const { loading, data, pagination, sessionReport, searchSessionId, filters } = state;
    const [inspectors, setInspectors] = React.useState([]);

    const setLoading = (val) => dispatch({ type: 'UPDATE', payload: { loading: val } });
    const setData = (val) => dispatch({ type: 'UPDATE', payload: { data: val } });
    const setPagination = (val) => dispatch({ type: 'UPDATE', payload: { pagination: val } });
    const setSessionReport = (val) => dispatch({ type: 'UPDATE', payload: { sessionReport: val } });
    const setShowDefectsModal = (val) => dispatch({ type: 'UPDATE', payload: { showDefectsModal: val } });
    const setSearchSessionId = (val) => dispatch({ type: 'UPDATE', payload: { searchSessionId: val } });
    const setFilters = (val) => dispatch({ type: 'UPDATE', payload: { filters: val } });

    // 1. Immutable Sorting
    const sortedData = useMemo(() => {
        if (!data || data.length === 0) return [];
        // Clone and sort by date DESC if it's a history list
        if (activeTab === 'SESSION_DETAILS') {
            return [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        return data;
    }, [data, activeTab]);

    // 2. Reactive Metrics
    const microMetrics = useMemo(() => {
        if (!data || data.length === 0) return { total: 0, today: 0, modules: 0, inspectors: 0 };

        const todayStr = new Date().toDateString();

        return data.reduce((acc, r) => {
            acc.total++;
            if (new Date(r.createdAt || r.date).toDateString() === todayStr) acc.today++;
            if (r.module_type) acc.modules.add(r.module_type);
            if (r.instructor_id || r.inspector_id) acc.inspectors.add(r.instructor_id || r.inspector_id);
            return acc;
        }, { total: 0, today: 0, modules: new Set(), inspectors: new Set() });
    }, [data]);

    useEffect(() => {
        const fetchInspectors = async () => {
            try {
                const { data: resData } = await getInspectors();
                setInspectors(resData || []);
            } catch (err) {
                console.error('Fetch Inspectors Error:', err);
                setInspectors([]);
            }
        };
        fetchInspectors();
    }, []);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleGenerate = async (page = 1) => {
        if (activeTab === 'SESSION_DETAILS') {
            if (sessionReport) return;
            setLoading(true);
            try {
                const res = await getRecentSessions({ ...filters, page, limit: 15 });
                setData(res.data.data || []);
                setPagination(res.data.pagination || { page: 1, total: 0, totalPages: 1 });
            } catch (err) {
                console.error('History Fetch Error:', err);
                setData([]);
            } finally {
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        try {
            let res;
            const params = { ...filters, page, limit: 15 };

            switch (activeTab) {
                case 'SUMMARY': res = await getReportSummary(params); break;
                case 'INSPECTORS': res = await getInspectorReport(params); break;
                case 'AGING': res = await getAgingReport(params); break;
                case 'REPEATED': res = await getRepeatedReport(params); break;
                default: break;
            }

            if (res && res.data) {
                if (activeTab === 'SUMMARY') {
                    setData(res.data.data ? [res.data.data] : []);
                    setPagination({ page: 1, total: 1, totalPages: 1 });
                } else {
                    setData(res.data.data || []);
                    setPagination(res.data.pagination || { page: 1, total: 0, totalPages: 1 });
                }
            } else {
                setData([]);
            }
        } catch (err) {
            console.error('Report Error:', err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        handleGenerate(1);
        if (activeTab === 'SESSION_DETAILS') {
            setSessionReport(null);
        }
    }, [activeTab]);

    useEffect(() => {
        if (location.state?.reportingId) {
            setSelectedTab('SESSION_DETAILS');
            handleFetchSession(location.state.reportingId);
        } else if (location.state?.sessionId) {
            setSelectedTab('SESSION_DETAILS');
            handleFetchSession(location.state.sessionId);
        }
    }, [location.state]);

    const handleFetchSession = async (sId) => {
        const idToSearch = sId || searchSessionId;
        if (!idToSearch) return alert('Enter Session ID');
        setLoading(true);
        try {
            const res = await getSessionReport(idToSearch);
            setSessionReport(res.data);
            setSearchSessionId(idToSearch);
        } catch (err) {
            console.error('Session Fetch Error:', err);
            setSessionReport(null);
            alert('Session not found');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format) => {
        try {
            if (sessionReport) {
                const sId = sessionReport.sessionInfo.sessionId;

                if (format === 'inline') {
                    // Open PDF in a new browser tab (inline mode)
                    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
                    const token = localStorage.getItem('token');
                    const pdfUrl = `${baseUrl}/reports/session/${sId}/export?inline=true`;
                    const response = await fetch(pdfUrl, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error('PDF generation failed');
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    window.open(blobUrl, '_blank');
                    return;
                }

                // Default: Download PDF as attachment
                const res = await exportSessionPDF(sId);
                const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `AuditReport_${sId}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                return;
            }

            // CSV or Excel export using dedicated endpoints
            const exportParams = { ...filters, type: activeTab };
            let res, filename, mimeType;

            if (format === 'csv') {
                res = await exportReportCSV(exportParams);
                filename = `Inspection_Report_${filters.fromDate}.csv`;
                mimeType = 'text/csv';
            } else {
                res = await exportReportExcel(exportParams);
                filename = `Inspection_Report_${filters.fromDate}.xlsx`;
                mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            }

            const url = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export Error:', err);
            alert('Export failed. Please ensure data is indexed.');
        }
    };

    return (
        <div className="content-area" style={{ height: 'calc(100vh - 80px)', overflowY: 'auto', paddingBottom: '80px' }}>
            <ReportsHeader activeTab={activeTab} filters={filters} />

            {/* Micro-Metrics Bar */}
            {!sessionReport && activeTab !== 'SUMMARY' && (
                <div className="dashboard-metric-bar">
                    <div className="dashboard-metric-chip">
                        <span className="dashboard-metric-label">Total Reports</span>
                        <span className="dashboard-metric-value">{microMetrics.total}</span>
                    </div>
                    <div className="dashboard-metric-chip">
                        <span className="dashboard-metric-label">Reports Today</span>
                        <span className="dashboard-metric-value" style={{ color: microMetrics.today > 0 ? 'var(--accent-green)' : 'inherit' }}>{microMetrics.today}</span>
                    </div>
                    <div className="dashboard-metric-chip">
                        <span className="dashboard-metric-label">Unique Modules</span>
                        <span className="dashboard-metric-value" style={{ color: 'var(--accent-blue)' }}>{microMetrics.modules.size}</span>
                    </div>
                    <div className="dashboard-metric-chip">
                        <span className="dashboard-metric-label">Active Inspectors</span>
                        <span className="dashboard-metric-value" style={{ color: 'var(--accent-teal)' }}>{microMetrics.inspectors.size}</span>
                    </div>
                </div>
            )}

            <ReportsFilterBar
                filters={filters}
                handleFilterChange={handleFilterChange}
                inspectors={inspectors}
                activeTab={activeTab}
                searchSessionId={searchSessionId}
                setSearchSessionId={setSearchSessionId}
                handleGenerate={handleGenerate}
                handleFetchSession={handleFetchSession}
                handleExport={handleExport}
                sessionReport={sessionReport}
            />

            {/* Horizontal Navigation */}
            <div style={{ marginBottom: '24px' }}>
                <div className="dashboard-tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSelectedTab(tab.id)}
                            className={`dashboard-tab-item ${activeTab === tab.id ? 'active' : ''}`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Results Area */}
            <div style={{ flex: 1 }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                        <div className="status-dot" style={{ background: 'var(--accent-blue)', width: '12px', height: '12px', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                    </div>
                ) : sessionReport ? (
                    <>
                        {renderSessionDetail(sessionReport, () => setSessionReport(null), () => setShowDefectsModal(true))}
                        <SessionDefectsModal 
                            isOpen={state.showDefectsModal} 
                            onClose={() => setShowDefectsModal(false)}
                            reportingId={sessionReport.sessionInfo.reportingId}
                            sessionTitle={`SES-${sessionReport.sessionInfo.sessionId}`}
                        />
                    </>
                ) : activeTab === 'SUMMARY' ? (
                    renderSummaryCards(data)
                ) : (
                    <div className="dashboard-glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="dashboard-table">
                                <thead>
                                    <TableHeader tab={activeTab} type="history" />
                                </thead>
                                <tbody>
                                    {sortedData.length > 0 ? (
                                        sortedData.map((row, idx) => renderTableRow(activeTab, row, activeTab === 'SESSION_DETAILS' ? (sId) => handleFetchSession(sId) : idx))
                                    ) : (
                                        <tr>
                                            <td colSpan="10" style={{ textAlign: 'center', padding: '100px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'var(--text-muted)' }}>
                                                    <Database size={48} strokeWidth={1} opacity={0.3} />
                                                    <div>
                                                        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>No audit records found</div>
                                                        <div style={{ fontSize: '13px' }}>Try adjusting your filters or search criteria.</div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {activeTab !== 'SUMMARY' && pagination.totalPages > 1 && (
                            <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                                    SHOWING PAGE {pagination.page} OF {pagination.totalPages}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        disabled={pagination.page === 1}
                                        onClick={() => handleGenerate(pagination.page - 1)}
                                        className="dashboard-btn dashboard-btn-secondary"
                                        style={{ padding: '6px 16px', fontSize: '11px', opacity: pagination.page === 1 ? 0.4 : 1 }}
                                    >
                                        <ChevronLeft size={14} /> PREV
                                    </button>
                                    <button
                                        disabled={pagination.page === pagination.totalPages}
                                        onClick={() => handleGenerate(pagination.page + 1)}
                                        className="dashboard-btn dashboard-btn-secondary"
                                        style={{ padding: '6px 16px', fontSize: '11px', opacity: pagination.page === pagination.totalPages ? 0.4 : 1 }}
                                    >
                                        NEXT <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportsPage;
