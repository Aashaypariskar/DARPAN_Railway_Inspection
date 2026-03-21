import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getStrategicDashboard } from '../api/reportsApi';
import { useNavigate } from 'react-router-dom';
import InspectionListModal from '../components/modals/InspectionListModal';

import {
    PieChart, Pie, Cell, Tooltip,
    ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Bar,
    AreaChart, Area
} from 'recharts';

const MOD_COLORS = {
    PITLINE: '#3b82f6',
    SICKLINE: '#f59e0b',
    COMMISSIONARY: '#10b981',
    CAI: '#a855f7',
    WSP: '#14b8a6'
};

const STATUS_GROUPS = {
    FINALIZED: ["SUBMITTED", "FINALIZED", "COMPLETED"],
    ACTIVE: ["IN_PROGRESS"],
    DRAFTS: ["DRAFT"]
};

const CountUp = ({ value, duration = 500 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const prevValue = useRef(0);

    useEffect(() => {
        let start = null;
        const end = parseInt(value) || 0;
        const startValue = displayValue;

        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const current = Math.floor(progress * (end - startValue) + startValue);
            setDisplayValue(current);
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
        prevValue.current = end;
    }, [value]);

    return <span>{displayValue.toLocaleString()}</span>;
};

const DashboardPage = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activePieIndex, setActivePieIndex] = useState(null);
    const [selectedStatusGroup, setSelectedStatusGroup] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const navigate = useNavigate();

    const onPieEnter = (_, index) => {
        setActivePieIndex(index);
    };

    const onPieLeave = () => {
        setActivePieIndex(null);
    };

    const fetchData = useCallback(async () => {
        try {
            const res = await getStrategicDashboard();
            setDashboardData(res.data);
        } catch (err) {
            console.error('Fetch Strategic Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Socket updates intentionally removed to reduce operational noise
    }, [fetchData]);

    if (loading && !dashboardData) return <div style={{ padding: '2rem', color: '#94a3b8' }}>Loading Compliance Console...</div>;

    const { complianceHealth, riskByModule, complianceTrend, inspectionPipeline, highRiskAssets, criticalAlerts, moduleDistribution } = dashboardData || {};

    const isDataLimited = (complianceHealth?.totalFinalized || 0) < 10;

    return (
        <div className="content-area" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .new-row { animation: slideIn 0.5s ease-out; }
                @keyframes slideIn { from { transform: translateX(-10px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.98); } 100% { opacity: 1; transform: scale(1); } }
                .hover-scale:hover { transform: translateY(-2px); }
            `}</style>

            {/* Row 1: Compliance Health */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="section-title" style={{ margin: 0 }}>Compliance Health</h2>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>
                        Based on Finalized Inspections
                    </div>
                </div>

                <div className="dashboard-row" style={{ alignItems: 'stretch' }}>
                    <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', width: '100%' }}>
                        <div className="summary-item" style={{ borderBottom: '3px solid #10b981' }}>
                            <span className="metric-label">Average Compliance</span>
                            <span className="metric-value"><CountUp value={complianceHealth?.avgCompliance || 0} />%</span>
                        </div>
                        <div className="summary-item" style={{ borderBottom: '3px solid #3b82f6' }}>
                            <span className="metric-label">Finalized Inspections</span>
                            <span className="metric-value"><CountUp value={complianceHealth?.totalFinalized || 0} /></span>
                        </div>
                        <div className="summary-item" style={{ borderBottom: '3px solid #f59e0b' }}>
                            <span className="metric-label">Defect Rate</span>
                            <span className="metric-value" style={{ color: '#f59e0b' }}><CountUp value={complianceHealth?.defectRate || 0} />%</span>
                        </div>
                        <div 
                            className="summary-item hover-scale" 
                            style={{ borderBottom: '3px solid #ef4444', cursor: 'pointer' }}
                            onClick={() => navigate('/defects', { state: { openDefects: true } })}
                        >
                            <span className="metric-label">Open Defects</span>
                            <span className="metric-value" style={{ color: '#ef4444' }}><CountUp value={complianceHealth?.openDefects || 0} /></span>
                            <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: '600', marginTop: '4px' }}>Active Risk</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Attention Required (Critical Alerts) */}
            <div className="dashboard-row" style={{ display: 'grid', gridTemplateColumns: '1fr', alignItems: 'stretch' }}>
                <div className="card" style={{ padding: '0', display: 'flex', flexDirection: 'column', border: '1px solid rgba(239, 68, 68, 0.2)', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.05)' }}>
                    <div style={{ padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.1) 0%, rgba(19, 25, 38, 1) 100%)', borderBottom: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <span className="section-title" style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
                            CRITICAL ALERTS
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Deficiencies</span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '240px', padding: '0.5rem 0' }}>
                        <table className="data-table" style={{ fontSize: '11px' }}>
                            <thead>
                                <tr style={{ position: 'sticky', top: '-0.5rem', zIndex: 1, background: '#131926' }}>
                                    <th style={{ width: '25%', paddingLeft: '1.5rem', color: '#64748b', fontSize: '9px', textTransform: 'uppercase' }}>Asset Target</th>
                                    <th style={{ width: '15%', color: '#64748b', fontSize: '9px', textTransform: 'uppercase' }}>Module</th>
                                    <th style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase' }}>Issue Description</th>
                                    <th style={{ width: '15%', color: '#64748b', fontSize: '9px', textTransform: 'uppercase' }}>Detection Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(criticalAlerts || []).map((alert, i) => (
                                    <tr key={`alert-${alert.defect_id || alert.id || i}`} style={{ borderBottom: i === criticalAlerts.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.02)' }}>
                                        <td style={{ paddingLeft: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }}></div>
                                                <span style={{ color: '#f8fafc', fontWeight: '600', letterSpacing: '0.3px' }}>{alert.assetLabel}</span>
                                            </div>
                                        </td>
                                        <td style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
                                            <span style={{ fontSize: '9px', fontWeight: '600', padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#fca5a5', letterSpacing: '0.5px' }}>
                                                {alert.module}
                                            </span>
                                        </td>
                                        <td style={{ color: '#e2e8f0', fontWeight: '400', lineHeight: '1.5', paddingTop: '1rem', paddingBottom: '1rem' }}>{alert.issue}</td>
                                        <td style={{ color: '#94a3b8', fontSize: '10px', paddingTop: '1rem', paddingBottom: '1rem' }}>{new Date(alert.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                    </tr>
                                ))}
                                {(!criticalAlerts || criticalAlerts.length === 0) && (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="#334155"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
                                                <span>No critical active alerts detected.</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Row 3: Risk & Trends */}
            <div className="dashboard-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'stretch' }}>
                {/* Risk Hotspots */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="section-title" style={{ margin: 0 }}>Risk Hotspots</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['PITLINE', 'SICKLINE', 'COMMISSIONARY', 'WSP', 'CAI'].map(mod => (
                                <div key={mod} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: MOD_COLORS[mod] }}></div>
                                    <span style={{ color: '#64748b' }}>{mod}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', gap: '24px', alignItems: 'center' }}>
                        <div style={{ width: '124px', height: '124px', position: 'relative', flexShrink: 0 }}>
                            <ResponsiveContainer width="100%" height="100%" key={moduleDistribution?.length || 0}>
                                <PieChart onMouseLeave={onPieLeave}>
                                    <Pie
                                        activeIndex={activePieIndex}
                                        activeShape={{
                                            outerRadius: 52,
                                            fill: (entry) => MOD_COLORS[entry.module] || '#94a3b8'
                                        }}
                                        data={moduleDistribution || []}
                                        cx="50%" cy="50%"
                                        innerRadius={32} outerRadius={46}
                                        paddingAngle={2} dataKey="count" stroke="none"
                                        onMouseEnter={onPieEnter}
                                    >
                                        {(moduleDistribution || []).map((entry, index) => (
                                            <Cell
                                                key={`pie-${entry.module || index}`}
                                                fill={MOD_COLORS[entry.module] || '#94a3b8'}
                                                style={{
                                                    filter: activePieIndex === index ? 'brightness(1.1)' : 'none',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease'
                                                }}
                                            />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Side Info Panel */}
                        <div style={{ width: '130px', flexShrink: 0, paddingLeft: '10px', borderLeft: '1px solid #1e293b' }}>
                            {activePieIndex !== null && moduleDistribution?.[activePieIndex] ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', animation: 'fadeIn 0.2s ease' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: MOD_COLORS[moduleDistribution[activePieIndex].module] }}></div>
                                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#f8fafc', whiteSpace: 'nowrap' }}>
                                            {moduleDistribution[activePieIndex].module}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#f8fafc', marginLeft: '14px' }}>
                                        {moduleDistribution[activePieIndex].count}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', marginLeft: '14px', textTransform: 'uppercase' }}>
                                        Sessions ({Math.round((moduleDistribution[activePieIndex].count / moduleDistribution.reduce((acc, curr) => acc + curr.count, 0)) * 100)}%)
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', opacity: 0.6 }}>
                                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Chart Summary
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#64748b' }}>
                                        {moduleDistribution?.reduce((acc, curr) => acc + curr.count, 0) || 0}
                                    </div>
                                    <div style={{ fontSize: '9px', color: '#475569', fontWeight: '500' }}>
                                        Total Inspections
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ flex: 1, height: '180px', position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%" key={riskByModule?.length || 0}>
                                <BarChart data={riskByModule || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="module" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{
                                            background: '#020617',
                                            border: '1px solid #1f2933',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            color: '#e5e7eb',
                                            boxShadow: '0 8px 20px rgba(0,0,0,0.45)'
                                        }}
                                        labelStyle={{
                                            color: '#9ca3af',
                                            fontSize: 11,
                                            marginBottom: 4
                                        }}
                                        itemStyle={{
                                            color: '#e5e7eb',
                                            fontSize: 12
                                        }}
                                        wrapperStyle={{ zIndex: 10 }}
                                        formatter={(value) => [`${value}%`, 'Defect Rate']}
                                    />
                                    <Bar dataKey="defectRate" barSize={30} radius={[4, 4, 0, 0]}>
                                        {(riskByModule || []).map((entry, index) => (
                                            <Cell key={`cell-${entry.module || index}`} fill={
                                                parseFloat(entry.defectRate) > 5 ? '#ef4444' :
                                                    parseFloat(entry.defectRate) > 2 ? '#f59e0b' : '#10b981'
                                            } />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Compliance Trend */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="section-title" style={{ margin: 0 }}>Compliance Trend (Last 30 Days)</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '220px', position: 'relative' }}>
                        <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%" key={complianceTrend?.length || 0}>
                                <AreaChart data={complianceTrend || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="colorCompliance" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                        tickFormatter={(val) => val ? val.split('-').slice(1).join('/') : ''}
                                    />
                                    <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#020617',
                                            border: '1px solid #1f2933',
                                            borderRadius: 6,
                                            color: '#e5e7eb',
                                            fontSize: 12,
                                            boxShadow: '0 8px 20px rgba(0,0,0,0.45)'
                                        }}
                                        labelStyle={{
                                            color: '#9ca3af',
                                            fontSize: 11,
                                            marginBottom: 4
                                        }}
                                        itemStyle={{
                                            color: '#e5e7eb',
                                            fontSize: 12
                                        }}
                                        wrapperStyle={{ zIndex: 10 }}
                                        formatter={(value) => [`${value}%`, 'Avg Compliance']}
                                        labelFormatter={(label) => `Date: ${label}`}
                                    />
                                    <Area type="monotone" dataKey="compliance" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCompliance)" activeDot={{ r: 6, fill: '#3b82f6', stroke: '#131926', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 4: Inspection Pipeline */}
            <div className="dashboard-row" style={{ display: 'grid', gridTemplateColumns: '1fr', alignItems: 'stretch' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', position: 'relative', overflow: 'hidden' }}>
                    {/* Background Glow */}
                    <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0) 70%)', pointerEvents: 'none' }}></div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                Inspection Pipeline
                                {inspectionPipeline?.overdueCount > 0 && (
                                    <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 'bold', animation: 'pulse 2s infinite' }}>
                                        {inspectionPipeline.overdueCount} OVERDUE
                                    </span>
                                )}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Current inspection lifecycle status across all modules</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', lineHeight: '1' }}>
                                {Math.round((inspectionPipeline?.finalizedCount / (inspectionPipeline?.totalSessions || 1)) * 100)}%
                            </div>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>Completion Rate</div>
                        </div>
                    </div>

                    {/* Status Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        {/* Finalized Card */}
                        <div 
                            style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'transform 0.2s', cursor: 'pointer' }} 
                            className="hover-scale"
                            onClick={() => { setSelectedStatusGroup('FINALIZED'); setModalOpen(true); }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>{Math.round((inspectionPipeline?.finalizedCount / (inspectionPipeline?.totalSessions || 1)) * 100)}%</span>
                            </div>
                            <span style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc' }}>{inspectionPipeline?.finalizedCount || 0}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Finalized & Submitted</span>
                        </div>

                        {/* In Progress Card */}
                        <div 
                            style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'transform 0.2s', cursor: 'pointer' }} 
                            className="hover-scale"
                            onClick={() => { setSelectedStatusGroup('ACTIVE'); setModalOpen(true); }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                </div>
                                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>{Math.round((inspectionPipeline?.inProgressCount / (inspectionPipeline?.totalSessions || 1)) * 100)}%</span>
                            </div>
                            <span style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc' }}>{inspectionPipeline?.inProgressCount || 0}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>In Active Inspection</span>
                        </div>

                        {/* Draft Card */}
                        <div 
                            style={{ background: 'rgba(148, 163, 184, 0.05)', border: '1px solid rgba(148, 163, 184, 0.1)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'transform 0.2s', cursor: 'pointer' }} 
                            className="hover-scale"
                            onClick={() => { setSelectedStatusGroup('DRAFTS'); setModalOpen(true); }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(148, 163, 184, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                </div>
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>{Math.round((inspectionPipeline?.draftCount / (inspectionPipeline?.totalSessions || 1)) * 100)}%</span>
                            </div>
                            <span style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc' }}>{inspectionPipeline?.draftCount || 0}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Drafts & Unassigned</span>
                        </div>
                    </div>

                    {/* Pipeline Visualization Bar */}
                    <div style={{ marginTop: '0.5rem' }}>
                        <div style={{ width: '100%', height: '32px', display: 'flex', borderRadius: '8px', overflow: 'hidden', background: '#1e293b', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                            {inspectionPipeline?.totalSessions > 0 ? (
                                <>
                                    <div style={{
                                        width: `${(inspectionPipeline.finalizedCount / inspectionPipeline.totalSessions) * 100}%`,
                                        background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
                                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                    }}>
                                        {inspectionPipeline.finalizedCount > 0 && `${inspectionPipeline.finalizedCount}`}
                                    </div>
                                    <div style={{
                                        width: `${(inspectionPipeline.inProgressCount / inspectionPipeline.totalSessions) * 100}%`,
                                        background: 'linear-gradient(90deg, #d97706 0%, #f59e0b 100%)',
                                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: 'bold', borderLeft: '1px solid rgba(0,0,0,0.1)', textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                    }}>
                                        {inspectionPipeline.inProgressCount > 0 && `${inspectionPipeline.inProgressCount}`}
                                    </div>
                                    <div style={{
                                        width: `${(inspectionPipeline.draftCount / inspectionPipeline.totalSessions) * 100}%`,
                                        background: 'linear-gradient(90deg, #475569 0%, #64748b 100%)',
                                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: 'bold', borderLeft: '1px solid rgba(0,0,0,0.1)', textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                    }}>
                                        {inspectionPipeline.draftCount > 0 && `${inspectionPipeline.draftCount}`}
                                    </div>
                                </>
                            ) : (
                                <div style={{ width: '100%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b' }}>No active pipeline data</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* High Risk Assets removed intentionally */}

            <footer style={{
                textAlign: "center",
                padding: "20px",
                opacity: 0.7,
                fontSize: "14px",
                color: "#64748b",
                marginTop: "20px"
            }}>
                Designed and Developed by Premade Innovations
            </footer>

            <InspectionListModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                statusGroup={selectedStatusGroup}
            />
        </div>
    );
};

export default DashboardPage;
