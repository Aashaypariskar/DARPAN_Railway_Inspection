import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCombinedReport } from '../api/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const CombinedReportScreen = ({ route, navigation }) => {
    const { coach_id, subcategory_id, activity_type, date } = route.params;
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const report = await getCombinedReport({ coach_id, subcategory_id, activity_type, date });
            setData(report);
        } catch (err) {
            console.error(err);
            Alert.alert('Error', err.response?.data?.error || 'Could not load combined report');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!data) return;
        try {
            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #1e293b; }
                        h1 { color: #0f172a; margin-bottom: 5px; }
                        .subtitle { color: #64748b; margin-bottom: 20px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; }
                        th { background-color: #f1f5f9; color: #475569; font-weight: bold; text-transform: uppercase; }
                        .text-red { color: #ef4444; font-weight: bold; }
                        .text-green { color: #22c55e; font-weight: bold; }
                        .text-grey { color: #94a3b8; font-style: italic; }
                        .footer { margin-top: 40px; border-top: 2px solid #e2e8f0; padding-top: 20px; }
                        .overall { font-size: 24px; font-weight: bold; margin-top: 10px; }
                        .green { color: #22c55e; }
                        .red { color: #ef4444; }
                    </style>
                </head>
                <body>
                    <h1>Combined Compartment Report</h1>
                    <div class="subtitle">
                        Coach: ${data.coach} | Area: ${data.subcategory} | Date: ${data.date} | Activity: ${data.activity_type}
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Question</th>
                                ${data.compartments.map(c => `<th>${c}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.matrix.map(row => `
                                <tr>
                                    <td>
                                        ${row.item ? `<div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 2px;">${row.item}</div>` : ''}
                                        <div>${row.question}</div>
                                    </td>
                                    ${data.compartments.map(comp => {
                const cell = row.values[comp];
                if (!cell) return `<td class="text-grey">Not Inspected</td>`;

                const status = cell.status || cell.answer; // Fallback for old data
                const isDeficiency = status === 'DEFICIENCY' || status === 'NO';
                const isOk = status === 'OK' || status === 'YES';
                const isValue = cell.answer_type === 'VALUE';
                const display = isValue ? `${cell.observed_value} ${cell.unit}`.trim() : status;
                const remark = cell.remarks || cell.reason || (cell.reasons && cell.reasons.length > 0 ? cell.reasons.join(', ') : '');

                let cssClass = '';
                if (isDeficiency) cssClass = 'text-red';
                else if (isOk) cssClass = 'text-green';
                else if (status === 'NA') cssClass = 'text-grey';

                let html = `<div class="${cssClass}">${display}</div>`;
                if ((isDeficiency || (isValue && remark)) && remark) {
                    html += `<div style="font-size: 10px; color: #64748b; font-style: italic; margin-top: 2px;">${remark}</div>`;
                }

                return `<td>${html}</td>`;
            }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="footer">
                        <h3>Compliance Summary</h3>
                        ${data.compartments.map(comp => `
                            <div>${comp}: <b>${data.compliance.per_compartment[comp] !== null ? `${data.compliance.per_compartment[comp]}%` : 'N/A'}</b></div>
                        `).join('')}
                        <div class="overall">
                            Overall Score: <span class="${data.compliance.overall < 80 ? 'red' : 'green'}">${data.compliance.overall}%</span>
                        </div>
                    </div>
                </body>
                </html>
            `;
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (err) {
            Alert.alert('Error', 'Failed to generate PDF');
        }
    };

    const renderCell = (cell) => {
        if (!cell) {
            return (
                <Text style={styles.notInspected}>
                    Not Inspected
                </Text>
            );
        }

        // DEBUG LOG FOR STEP 5
        console.log("Rendering Cell:", cell);

        const status = cell.status || cell.answer; // Backward compatibility
        const reasonText = cell.remarks || cell.reason || (Array.isArray(cell.reasons) && cell.reasons.length > 0 ? cell.reasons.join(', ') : null);

        if (status === "OK" || status === "YES") {
            return (
                <Text style={styles.yes}>
                    {status}
                </Text>
            );
        }

        if (status === "DEFICIENCY" || status === "NO") {
            return (
                <View>
                    <Text style={styles.no}>
                        {status}
                    </Text>
                    {reasonText && (
                        <Text style={styles.remarkText}>
                            {reasonText}
                        </Text>
                    )}
                </View>
            );
        }

        if (status === "NA") {
            return (
                <Text style={styles.notInspected}>
                    NA
                </Text>
            );
        }

        // Handle VALUE types or other answers
        return (
            <Text style={styles.rowText}>
                {cell.answer_type === 'VALUE' ? `${cell.observed_value} ${cell.unit}`.trim() : cell.answer}
            </Text>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
    if (!data) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Combined Report</Text>
                    <Text style={styles.subtitle}>{data.subcategory} - {data.coach} ({data.activity_type})</Text>
                    <Text style={styles.dateText}>{data.date}</Text>
                </View>
                <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
                    <Ionicons name="download-outline" size={24} color="#2563eb" />
                </TouchableOpacity>
            </View>

            <ScrollView horizontal style={styles.tableScroll}>
                <View>
                    {/* Header Row */}
                    <View style={styles.tableHeader}>
                        <View style={[styles.cell, styles.questionCellHeader]}>
                            <Text style={styles.headerText}>Question</Text>
                        </View>
                        {data.compartments.map(comp => (
                            <View key={comp} style={[styles.cell, styles.compCellHeader]}>
                                <Text style={styles.headerText}>{comp}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Matrix Rows */}
                    <ScrollView style={styles.rowsContainer}>
                        {data.matrix.map((row, idx) => (
                            <View key={idx} style={[styles.row, idx % 2 === 1 && styles.alternateRow]}>
                                <View style={[styles.cell, styles.questionCell]}>
                                    {row.item && <Text style={styles.itemText}>{row.item}</Text>}
                                    <Text style={styles.rowText}>{row.question}</Text>
                                </View>
                                {data.compartments.map(comp => (
                                    <View key={comp} style={[styles.cell, styles.compCell]}>
                                        {renderCell(row.values[comp])}
                                    </View>
                                ))}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>

            {/* Compliance Section */}
            <View style={styles.footer}>
                <Text style={styles.footerTitle}>Compliance Summary</Text>
                <View style={styles.compGrid}>
                    {data.compartments.map(comp => (
                        <View key={comp} style={styles.statBox}>
                            <Text style={styles.statLabel}>{comp}</Text>
                            <Text style={[
                                styles.statValue,
                                (data.compliance.per_compartment[comp] || 0) < 80 ? styles.textRed : styles.textGreen
                            ]}>
                                {data.compliance.per_compartment[comp] !== null ? `${data.compliance.per_compartment[comp]}%` : 'N/A'}
                            </Text>
                        </View>
                    ))}
                </View>
                <View style={styles.overallBox}>
                    <Text style={styles.overallLabel}>Overall Compliance Score</Text>
                    <Text style={[styles.overallValue, data.compliance.overall < 80 ? styles.textRed : styles.textGreen]}>
                        {data.compliance.overall}%
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backRow: { flexDirection: 'row', alignItems: 'center' },
    backButton: { marginRight: 15 },
    exportButton: { padding: 8 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 13, color: '#64748b' },
    dateText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
    tableScroll: { flex: 1 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
    cell: { padding: 12, justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
    questionCellHeader: { width: 300 },
    compCellHeader: { width: 100, alignItems: 'center' },
    headerText: { fontWeight: 'bold', color: '#475569', fontSize: 12 },
    rowsContainer: { flex: 1 },
    row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    alternateRow: { backgroundColor: '#fdfdfd' },
    questionCell: { width: 300 },
    compCell: { width: 100, alignItems: 'center' },
    itemText: { fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 2, textTransform: 'uppercase' },
    rowText: { fontSize: 12, color: '#334155' },
    textRed: { color: '#ef4444', fontWeight: 'bold' },
    textGreen: { color: '#22c55e', fontWeight: 'bold' },
    textGrey: { color: '#94a3b8', fontStyle: 'italic' },
    remarkText: { fontSize: 9, color: '#64748b', marginTop: 2, fontStyle: 'italic' },
    yes: { color: "green", fontWeight: "600", fontSize: 12 },
    no: { color: "red", fontWeight: "700", fontSize: 12 },
    reason: { fontSize: 10, color: "#666", marginTop: 2, fontStyle: 'italic' },
    notInspected: { color: "#999", fontStyle: "italic", fontSize: 11 },
    footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 2, borderTopColor: '#e2e8f0' },
    footerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
    compGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
    statBox: { width: '23%', alignItems: 'center', padding: 10, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    statLabel: { fontSize: 10, color: '#64748b', fontWeight: 'bold', marginBottom: 4 },
    statValue: { fontSize: 14, fontWeight: 'bold' },
    overallBox: { backgroundColor: '#1e293b', padding: 18, borderRadius: 16, alignItems: 'center', elevation: 4 },
    overallLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
    overallValue: { fontSize: 28, fontWeight: 'bold', color: '#fff' }
});

export default CombinedReportScreen;
