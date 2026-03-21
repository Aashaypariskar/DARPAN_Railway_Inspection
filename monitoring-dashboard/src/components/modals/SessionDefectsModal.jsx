import React, { useState, useEffect } from 'react';
import { X, Box, CheckCircle2, AlertTriangle, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { getSessionDefects } from '../../api/reportsApi';
import { getServerBaseUrl, buildImageUrl } from '../../utils/urlHelper';

const SessionDefectsModal = ({ isOpen, onClose, reportingId, sessionTitle }) => {
    const [defects, setDefects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => {
        if (isOpen && reportingId) {
            const fetchDefects = async () => {
                setLoading(true);
                try {
                    const res = await getSessionDefects(reportingId);
                    setDefects(res.data || []);
                } catch (err) {
                    console.error('Fetch Defects Modal Error:', err);
                } finally {
                    setLoading(false);
                }
            };
            fetchDefects();
        }
    }, [isOpen, reportingId]);

    if (!isOpen) return null;

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

    // Group defects by section_title
    const groupedDefects = defects.reduce((acc, d) => {
        const section = d.section_title || 'General';
        if (!acc[section]) acc[section] = [];
        acc[section].push(d);
        return acc;
    }, {});

    const renderThumbnail = (path, label) => {
        const fullUrl = buildImageUrl(path);
        if (!fullUrl) return <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>N/A</div>;
        
        return (
            <div 
                style={{ position: 'relative', width: '60px', height: '60px', cursor: 'pointer', overflow: 'hidden', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={() => setPreviewImage({ url: fullUrl, label })}
            >
                <img 
                    src={fullUrl} 
                    alt={label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                    className="thumbnail-img"
                />
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} className="thumbnail-overlay">
                    <Maximize2 size={12} color="#fff" style={{ opacity: 0 }} className="preview-icon" />
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="modal-overlay" style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                zIndex: 1000, backdropFilter: 'blur(8px)', padding: '20px'
            }}>
                <div className="dashboard-glass-card" style={{
                    width: '100%', maxWidth: '1100px', maxHeight: '90vh',
                    display: 'flex', flexDirection: 'column', padding: '0',
                    border: '1px solid var(--border-color)', overflow: 'hidden',
                    animation: 'slideUp 0.3s ease-out'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'rgba(255,255,255,0.02)'
                    }}>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#fff', letterSpacing: '-0.01em' }}>
                                SESSION DEFICIENCIES
                            </h2>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>
                                {sessionTitle} | {defects.length} DEFECTS IDENTIFIED
                            </div>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff', borderRadius: '50%', width: '32px', height: '32px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* Table Container */}
                    <div style={{ padding: '0', overflowY: 'auto', flex: 1, overflowX: 'auto' }}>
                        {loading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                                <div className="status-dot" style={{ background: 'var(--accent-blue)', width: '12px', height: '12px', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                            </div>
                        ) : defects.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                                <CheckCircle2 size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                <div>No deficiencies recorded for this session.</div>
                            </div>
                        ) : (
                            <table className="dashboard-table" style={{ borderCollapse: 'collapse', width: '100%', border: 'none' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--card-bg)' }}>
                                    <tr>
                                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', width: '40px' }}>#</th>
                                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>SECTION</th>
                                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>QUESTION</th>
                                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>REASON</th>
                                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>REMARK</th>
                                        <th style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', width: '80px' }}>BEFORE</th>
                                        <th style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', width: '80px' }}>STATUS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(groupedDefects).map(([section, items], sIdx) => (
                                        <React.Fragment key={section}>
                                            <tr style={{ background: 'rgba(255, 68, 68, 0.05)', borderLeft: '4px solid var(--danger)' }}>
                                                <td colSpan="7" style={{ padding: '10px 16px', fontWeight: '800', fontSize: '12px', letterSpacing: '1px', color: 'var(--danger)' }}>
                                                    {section.toUpperCase()} <span style={{ opacity: 0.6, fontSize: '10px' }}>({items.length} DEFECTS)</span>
                                                </td>
                                            </tr>
                                            {items.map((item, idx) => {
                                                return (
                                                    <tr key={item.reporting_answer_id || `${section}-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                        <td style={{ padding: '16px', fontWeight: '600', color: 'var(--text-muted)', fontSize: '12px' }}>{idx + 1}</td>
                                                        <td style={{ padding: '16px', fontSize: '12px', fontWeight: '700' }}>{section}</td>
                                                        <td style={{ padding: '16px', fontSize: '13px', lineHeight: '1.4', fontWeight: '500', minWidth: '200px' }}>{item.question_text}</td>
                                                         <td style={{ padding: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{getReasons(item)}</td>
                                                         <td style={{ padding: '16px', fontSize: '12px' }}>
                                                             {getRemark(item) ? (
                                                                 <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '8px' }}>
                                                                     {getRemark(item)}
                                                                 </div>
                                                             ) : <span style={{ opacity: 0.3 }}>—</span>}
                                                         </td>
                                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                                            {renderThumbnail(
                                                                item.before_photo_url || item.beforeImage || item.photo_url || item.photoUrl, 
                                                                'Before'
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                                            <div className={`dashboard-badge ${item.resolved ? 'dashboard-badge-green' : 'dashboard-badge-amber'}`} style={{ fontSize: '9px' }}>
                                                                {item.resolved ? 'RESOLVED' : 'OPEN'}
                                                            </div>
                                                            {item.resolved && renderThumbnail(
                                                                item.after_photo_url || item.afterImage || item.afterPhotoUrl || item.resolved_photo_url, 
                                                                'After'
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '16px 24px', borderTop: '1px solid var(--border-color)',
                        display: 'flex', justifyContent: 'flex-end', background: 'rgba(255,255,255,0.01)'
                    }}>
                        <button onClick={onClose} className="dashboard-btn dashboard-btn-secondary" style={{ padding: '8px 24px' }}>
                            CLOSE
                        </button>
                    </div>
                </div>
            </div>

            {/* Image Preview Overlay */}
            {previewImage && (
                <div 
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.95)', zIndex: 2000,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '40px', cursor: 'zoom-out', animation: 'fadeIn 0.2s'
                    }}
                    onClick={() => setPreviewImage(null)}
                >
                    <div style={{ position: 'absolute', top: '20px', right: '20px', color: '#fff' }}>
                        <X size={32} style={{ cursor: 'pointer' }} />
                    </div>
                    <img 
                        src={previewImage.url} 
                        alt="Preview" 
                        style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} 
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div style={{ marginTop: '20px', color: '#fff', fontSize: '14px', fontWeight: '700', letterSpacing: '1px' }}>
                        {previewImage.label.toUpperCase()}
                    </div>
                </div>
            )}

            <style>{`
                .thumbnail-img:hover { transform: scale(1.1); }
                .thumbnail-overlay:hover { background: rgba(0, 0, 0, 0.4) !important; }
                .thumbnail-overlay:hover .preview-icon { opacity: 1 !important; }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
};

export default SessionDefectsModal;
