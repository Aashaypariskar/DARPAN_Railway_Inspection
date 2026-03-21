export const calculateCompliance = (answersList) => {
    // answersList is typically an array of answer objects
    if (!answersList || answersList.length === 0) return 100;

    // Support both entry format [id, data] and direct data objects
    const dataOnly = answersList.map(a => Array.isArray(a) ? a[1] : a);

    const ok = dataOnly.filter(a => a?.status === 'OK' || a?.answer === 'YES').length;
    const def = dataOnly.filter(a => a?.status === 'DEFICIENCY' || a?.answer === 'NO').length;

    const total = ok + def;
    return total === 0 ? 100 : Math.round((ok / total) * 100);
};
