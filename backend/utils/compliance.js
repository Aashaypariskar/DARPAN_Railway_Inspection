function calculateCompliance(records) {
    if (!records || records.length === 0) return 100;

    const ok = records.filter(r => r.status === 'OK' || r.answer === 'YES').length;
    const def = records.filter(r => r.status === 'DEFICIENCY' || r.answer === 'NO').length;

    // Support both new 'status' and legacy 'answer' for backward compatibility during transition
    const total = ok + def;

    return total === 0 ? 100 : (ok / total) * 100;
}

module.exports = { calculateCompliance };
