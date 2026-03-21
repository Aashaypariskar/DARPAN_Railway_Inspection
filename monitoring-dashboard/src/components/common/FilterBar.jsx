import React, { useState, useEffect } from 'react';
import { getUsers as getInspectors } from '../../api/monitoringApi';
import { Filter, Calendar, User, Layers, CheckCircle2, X } from 'lucide-react';

const FilterBar = ({ onFilterChange, isDefectsView = false }) => {
    const today = new Date().toISOString().split('T')[0];
    const [inspectors, setInspectors] = useState([]);
    const [filters, setFilters] = useState({
        startDate: today,
        endDate: today,
        module: '',
        inspector: '',
        status: ''
    });

    useEffect(() => {
        const fetchInspectors = async () => {
            try {
                const { data } = await getInspectors();
                setInspectors(data);
            } catch (err) {
                console.error('Failed to fetch inspectors', err);
            }
        };
        fetchInspectors();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleClear = () => {
        const cleared = { startDate: today, endDate: today, module: '', inspector: '', status: '' };
        setFilters(cleared);
        onFilterChange(cleared);
    };

    return (
        <div className="defects-glass-card" style={{ marginBottom: 'var(--space-md)', padding: '1.5rem' }}>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '24px',
                alignItems: 'flex-end'
            }}>
                <div style={filterGroupStyle}>
                    <label htmlFor="filter-start-date" style={labelStyle}>
                        <Calendar size={10} style={{ marginRight: '6px' }} /> DATE RANGE
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            id="filter-start-date"
                            type="date"
                            name="startDate"
                            className="defects-filter-input"
                            value={filters.startDate}
                            onChange={handleChange}
                            style={{ width: '130px' }}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700' }}>→</span>
                        <input
                            id="filter-end-date"
                            type="date"
                            name="endDate"
                            className="defects-filter-input"
                            value={filters.endDate}
                            onChange={handleChange}
                            style={{ width: '130px' }}
                        />
                    </div>
                </div>

                <div style={filterGroupStyle}>
                    <label htmlFor="filter-module" style={labelStyle}>
                        <Layers size={10} style={{ marginRight: '6px' }} /> MODULE
                    </label>
                    <select
                        id="filter-module"
                        name="module"
                        className="defects-filter-input"
                        value={filters.module}
                        onChange={handleChange}
                        style={{ width: '160px' }}
                    >
                        <option value="">All Modules</option>
                        <option value="WSP">WSP</option>
                        <option value="SICKLINE">Sickline</option>
                        <option value="COMMISSIONARY">Commissionary</option>
                        <option value="CAI">CAI</option>
                        <option value="PITLINE">Pitline</option>
                    </select>
                </div>

                <div style={filterGroupStyle}>
                    <label htmlFor="filter-inspector" style={labelStyle}>
                        <User size={10} style={{ marginRight: '6px' }} /> INSPECTOR
                    </label>
                    <select
                        id="filter-inspector"
                        name="inspector"
                        className="defects-filter-input"
                        value={filters.inspector}
                        onChange={handleChange}
                        style={{ width: '180px' }}
                    >
                        <option value="">All Inspectors</option>
                        {inspectors.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>

                <div style={filterGroupStyle}>
                    <label htmlFor="filter-status" style={labelStyle}>
                        <CheckCircle2 size={10} style={{ marginRight: '6px' }} /> STATUS
                    </label>
                    <select
                        id="filter-status"
                        name="status"
                        className="defects-filter-input"
                        value={filters.status}
                        onChange={handleChange}
                        style={{ width: '150px' }}
                    >
                        <option value="">All Statuses</option>
                        {isDefectsView ? (
                            <>
                                <option value="0">Open</option>
                                <option value="1">Resolved</option>
                            </>
                        ) : (
                            <>
                                <option value="COMPLETED">Completed</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="SUBMITTED">Submitted</option>
                            </>
                        )}
                    </select>
                </div>

                <div style={{ marginLeft: 'auto' }}>
                    <button
                        onClick={handleClear}
                        className="defects-btn-interactive"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', height: 'auto' }}
                    >
                        <X size={14} /> CLEAR FILTERS
                    </button>
                </div>
            </div>
        </div>
    );
};

const filterGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};

const labelStyle = {
    fontSize: '10px',
    fontWeight: '800',
    color: 'var(--text-muted)',
    letterSpacing: '0.8px',
    display: 'flex',
    alignItems: 'center'
};

export default FilterBar;
