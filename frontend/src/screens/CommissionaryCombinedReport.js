import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { getCommissionaryCombinedReport } from '../api/api';
import { Ionicons } from '@expo/vector-icons';

const CommissionaryCombinedReport = ({ route, navigation }) => {
    const { sessionId } = route.params;
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReport();
    }, []);

    const loadReport = async () => {
        try {
            const data = await getCommissionaryCombinedReport(sessionId);
            setReport(data);
        } catch (err) {
            Alert.alert('Error', 'Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
    if (!report) return <View style={styles.center}><Text>No data available</Text></View>;

    const { matrix, stats, compartments, coach_number, date } = report;

    const renderCell = (cell) => {
        if (!cell) return <View style={styles.cell}><Text style={styles.cellDash}>-</Text></View>;

        const isNo = cell.answer === 'NO';
        return (
            <View style={[styles.cell, isNo && styles.cellNo]}>
                <View style={styles.cellHeader}>
                    <Text style={[styles.cellAnswer, isNo && styles.textNo]}>{cell.answer}</Text>
                    {cell.hasPhoto && <Ionicons name="image" size={12} color={isNo ? "#ef4444" : "#2563eb"} />}
                </View>
                {isNo && cell.remark && (
                    <Text style={styles.remarkText} numberOfLines={2}>{cell.remark}</Text>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>COMBINED COACH REPORT</Text>
                <Text style={styles.headerSub}>Coach: {coach_number} | Date: {date}</Text>
            </View>

            <ScrollView horizontal bounces={false}>
                <View>
                    {/* Table Header */}
                    <View style={styles.tableRow}>
                        <View style={[styles.cell, styles.qCell, { backgroundColor: '#f1f5f9' }]}>
                            <Text style={styles.headerText}>Question</Text>
                        </View>
                        {compartments.map(c => (
                            <React.Fragment key={c}>
                                <View style={[styles.cell, styles.compHeader]}>
                                    <Text style={styles.headerText}>{c} Major</Text>
                                </View>
                                <View style={[styles.cell, styles.compHeader]}>
                                    <Text style={styles.headerText}>{c} Minor</Text>
                                </View>
                            </React.Fragment>
                        ))}
                    </View>

                    {/* Table Data */}
                    <ScrollView vertical showsVerticalScrollIndicator={false}>
                        {Object.values(matrix).map(sub => (
                            <View key={sub.subName}>
                                <View style={styles.subHeader}>
                                    <Text style={styles.subHeaderText}>{sub.subName.toUpperCase()}</Text>
                                    <Text style={styles.subCompliance}>
                                        Compliance: {stats.subcategories[Object.keys(matrix).find(k => matrix[k].subName === sub.subName)]?.total > 0
                                            ? Math.round((stats.subcategories[Object.keys(matrix).find(k => matrix[k].subName === sub.subName)].yes / stats.subcategories[Object.keys(matrix).find(k => matrix[k].subName === sub.subName)].total) * 100)
                                            : 0}%
                                    </Text>
                                </View>
                                {Object.values(sub.questions).map((q, idx) => (
                                    <View key={idx} style={styles.tableRow}>
                                        <View style={[styles.cell, styles.qCell]}>
                                            <Text style={styles.qText}>{q.qText}</Text>
                                        </View>
                                        {compartments.map(c => {
                                            const cell = q.cells[c] || {};
                                            return (
                                                <React.Fragment key={c}>
                                                    {renderCell(cell.Major)}
                                                    {renderCell(cell.Minor)}
                                                </React.Fragment>
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.statBox}>
                    <Text style={styles.statVal}>{stats.overall.yes}/{stats.overall.total}</Text>
                    <Text style={styles.statLabel}>Compliance</Text>
                </View>
                <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: '#f1f5f9' }]}>
                    <Text style={[styles.statVal, { color: '#10b981' }]}>
                        {stats.overall.total > 0 ? Math.round((stats.overall.yes / stats.overall.total) * 100) : 0}%
                    </Text>
                    <Text style={styles.statLabel}>Score</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { padding: 20, paddingTop: 50, backgroundColor: '#1e293b' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    headerSub: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    cell: { width: 120, padding: 10, justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#f1f5f9' },
    qCell: { width: 250 },
    compHeader: { backgroundColor: '#f8fafc', alignItems: 'center' },
    headerText: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
    subHeader: { backgroundColor: '#eff6ff', padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    subHeaderText: { fontSize: 12, fontWeight: 'bold', color: '#2563eb' },
    subCompliance: { fontSize: 10, color: '#3b82f6', fontWeight: 'bold' },
    qText: { fontSize: 13, color: '#334155' },
    cellHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cellAnswer: { fontSize: 14, fontWeight: 'bold', color: '#10b981' },
    cellNo: { backgroundColor: '#fff1f2' },
    textNo: { color: '#ef4444' },
    cellDash: { color: '#cbd5e1', textAlign: 'center' },
    remarkText: { fontSize: 10, color: '#9f1239', marginTop: 4, fontStyle: 'italic' },
    footer: { flexDirection: 'row', backgroundColor: '#fff', elevation: 10, padding: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    statBox: { flex: 1, alignItems: 'center' },
    statVal: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    statLabel: { fontSize: 10, color: '#64748b', marginTop: 2 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CommissionaryCombinedReport;
