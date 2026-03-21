import React, { useReducer, useEffect, useMemo } from 'react';
import { getDefects } from '../api/monitoringApi';
import { useLocation } from 'react-router-dom';
import { getInitialImage, getResolvedImage } from '../utils/urlHelper';
import FilterBar from '../components/common/FilterBar';
import {
    AlertCircle,
    CheckCircle2,
    Database,
    Percent,
    ChevronLeft,
    ChevronRight,
    Tornado,
    Clock
} from 'lucide-react';

const initialState = {
    defects: [],
    page: 1,
    filters: {},
    loading: true
};

function defectsReducer(state, action) {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, loading: true };
        case 'FETCH_SUCCESS':
            return { ...state, loading: false, defects: action.payload };
        case 'FETCH_ERROR':
            return { ...state, loading: false };
        case 'SET_PAGE':
            return { ...state, page: action.payload };
        case 'SET_FILTERS':
            return { ...state, filters: action.payload, page: 1 };
        default:
            return state;
    }
}

const DefectsPage = () => {
    const [state, dispatch] = useReducer(defectsReducer, initialState);
    const { defects, page, filters, loading } = state;
    const location = useLocation();
    const limit = 25;

    useEffect(() => {
        const loadData = async () => {
            dispatch({ type: 'FETCH_START' });
            try {
                const res = await getDefects(page, 25, filters);
                dispatch({ type: 'FETCH_SUCCESS', payload: res.data });
            } catch (err) {
                console.error(err);
                dispatch({ type: 'FETCH_ERROR' });
            }
        };

        loadData();
    }, [page, filters]);

    useEffect(() => {
        if (location.state?.openDefects) {
            dispatch({ type: 'SET_FILTERS', payload: { ...filters, resolved: false } });
        }
    }, [location.state]);

    // Memoized Metrics derived from the current filtered dataset
    const metrics = useMemo(() => {
        const total = defects.length;
        const resolved = defects.filter(d => d.resolved).length;
        const open = total - resolved;
        const complianceVal = total === 0 ? "N/A" : `${Math.round((resolved / total) * 100)}%`;

        return { total, resolved, open, compliance: complianceVal };
    }, [defects]);

    const handleFilterChange = (newFilters) => {
        dispatch({ type: 'SET_FILTERS', payload: newFilters });
    };

    return (
        <div className="content-area" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-md)' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
                            Open & Resolved Defects
                        </h1>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Live anomaly tracking across all inspection modules
                        </p>
                    </div>
                </div>

                {/* Micro Metrics Bar */}
                <div className="defects-metric-bar">
                    <div className="defects-metric-chip">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="defects-metric-label">Open Defects</span>
                            <AlertCircle size={14} color="var(--accent-amber)" opacity={0.8} />
                        </div>
                        <span className="defects-metric-value" style={{ color: 'var(--accent-amber)' }}>{metrics.open}</span>
                    </div>
                    <div className="defects-metric-chip">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="defects-metric-label">Resolved Total</span>
                            <CheckCircle2 size={14} color="var(--accent-green)" opacity={0.8} />
                        </div>
                        <span className="defects-metric-value" style={{ color: 'var(--accent-green)' }}>{metrics.resolved}</span>
                    </div>
                    <div className="defects-metric-chip">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="defects-metric-label">Total Defects</span>
                            <Database size={14} color="var(--accent-blue)" opacity={0.8} />
                        </div>
                        <span className="defects-metric-value">{metrics.total}</span>
                    </div>
                    <div className="defects-metric-chip">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="defects-metric-label">Compliance %</span>
                            <Percent size={14} color="var(--accent-teal)" opacity={0.8} />
                        </div>
                        <span className="defects-metric-value">{metrics.compliance}</span>
                    </div>
                </div>
            </div>

            <FilterBar onFilterChange={handleFilterChange} isDefectsView={true} />

            <div className="defects-glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Tornado size={14} color="var(--accent-blue)" />
                    <span className="section-title" style={{ margin: 0, fontSize: '11px', letterSpacing: '1px' }}>GLOBAL DEFICIENCY STREAM</span>
                </div>

                <div className="table-container" style={{ overflowX: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <div className="loading-spinner" />
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>Synchronizing deficiency data...</span>
                        </div>
                    ) : (
                        <table className="defects-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '100px' }}>MODULE</th>
                                    <th style={{ width: '120px' }}>DEFECT ID</th>
                                    <th style={{ width: '120px' }}>SESSION ID</th>
                                    <th style={{ width: '150px' }}>STATUS</th>
                                    <th style={{ minWidth: '300px' }}>ISSUE DESCRIPTION</th>
                                    <th style={{ width: '160px' }}>EVIDENCE</th>
                                    <th style={{ width: '180px', textAlign: 'right' }}>TIMESTAMP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {defects.map((d) => (
                                    <tr key={`${d.module_type}-${d.defect_id}`}>
                                        <td>
                                            <span style={{
                                                backgroundColor: (MOD_COLORS[d.module_type] || '#3b82f6') + '15',
                                                color: MOD_COLORS[d.module_type] || '#3b82f6',
                                                border: `1px solid ${(MOD_COLORS[d.module_type] || '#3b82f6')}30`,
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '10px',
                                                fontFamily: 'monospace',
                                                fontWeight: '700'
                                            }}>
                                                {d.module_type}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: '700', color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
                                            DEF-{d.answer_id || d.defect_id}
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                            S-{d.session_id}
                                        </td>
                                        <td>
                                            <div className={`defects-badge ${d.resolved ? 'defects-badge-resolved' : 'defects-badge-open'}`}>
                                                {d.resolved ? <CheckCircle2 size={10} style={{ marginRight: '6px' }} /> : <Clock size={10} style={{ marginRight: '6px' }} />}
                                                {d.resolved ? 'RESOLVED' : 'OPEN'}
                                            </div>
                                        </td>
                                        <td style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: '1.5', paddingRight: '20px' }}>
                                            {d.question_text || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No description available</span>}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                {getInitialImage(d) || getResolvedImage(d) ? (
                                                    <>
                                                        {getInitialImage(d) && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                                                <a href={getInitialImage(d)} target="_blank" rel="noreferrer" className="defects-thumbnail-container">
                                                                    <img
                                                                        src={getInitialImage(d)}
                                                                        alt="Before"
                                                                        className="defects-thumbnail-img"
                                                                    />
                                                                </a>
                                                                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700' }}>
                                                                    INITIAL
                                                                </span>
                                                            </div>
                                                        )}
                                                        {getResolvedImage(d) && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                                                <a href={getResolvedImage(d)} target="_blank" rel="noreferrer" className="defects-thumbnail-container" style={{ borderColor: 'var(--accent-green)' }}>
                                                                    <img
                                                                        src={getResolvedImage(d)}
                                                                        alt="After"
                                                                        className="defects-thumbnail-img"
                                                                    />
                                                                </a>
                                                                <span style={{ fontSize: '9px', color: 'var(--accent-green)', fontWeight: '700' }}>
                                                                    RESOLVED
                                                                </span>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No Evidence</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'right', fontWeight: '500' }}>
                                            {new Date(d.created_at).toLocaleString('en-IN', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                    </tr>
                                ))}
                                {defects.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '5rem', textAlign: 'center' }}>
                                            <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                <Database size={32} opacity={0.2} />
                                                <span style={{ fontSize: '14px' }}>No defects found matching your current filters.</span>
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
                        BATCH #{page} | RENDERING {defects.length} ANOMALIES
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            className="defects-btn-interactive"
                            disabled={page === 1 || loading}
                            onClick={() => dispatch({ type: 'SET_PAGE', payload: Math.max(1, page - 1) })}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <ChevronLeft size={14} /> PREVIOUS
                        </button>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)', minWidth: '80px', textAlign: 'center', fontFamily: 'monospace' }}>
                            PAGE {page}
                        </span>
                        <button
                            className="defects-btn-interactive"
                            disabled={defects.length < limit || loading}
                            onClick={() => dispatch({ type: 'SET_PAGE', payload: page + 1 })}
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

export default DefectsPage;
