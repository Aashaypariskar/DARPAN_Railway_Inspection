import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Share, Image } from 'react-native';
import { getReportDetails } from '../api/api';
import { BASE_URL } from '../config/environment';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const ReportDetailScreen = ({ route, navigation }) => {
    const { submission_id, train_number, coach_number, date, user_name, user_id } = route.params;
    const [details, setDetails] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const getRemark = (item) => item.remark || item.remarks || '';
    const getReasons = (item) => {
        if (Array.isArray(item.reasons)) return item.reasons.join(', ');
        if (typeof item.reasons === 'string') {
            try {
                const parsed = JSON.parse(item.reasons);
                if (Array.isArray(parsed)) return parsed.join(', ');
            } catch (e) { }
        }
        return item.reasons || item.reason || '-';
    };

    // Phase 5: Build absolute URL using the host part of BASE_URL
    const buildUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const host = BASE_URL.split('/api')[0];
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${host}${normalizedPath}`;
    };

    useEffect(() => {
        fetchDetails();
    }, []);

    const fetchDetails = async () => {
        try {
            const data = await getReportDetails({ submission_id, train_number, coach_number, date, user_id });
            setDetails(data.details || []);
            setStats(data.stats || null);
        } catch (err) {
            Alert.alert('Error', 'Failed to load details');
        } finally {
            setLoading(false);
        }
    };

    const handleHome = () => {
        navigation.navigate('Dashboard');
    };

    const categoryNameRaw = details.length > 0 && details[0]?.category_name
        ? details[0].category_name
        : 'Inspection Report';
    const categoryName = categoryNameRaw === 'Coach Commissionary' ? 'Coach Commissioning' : categoryNameRaw;

    const generateHtml = () => {
        const sectionsHtml = details.map(area => {
            const activitiesHtml = (area.activities || []).map(activity => {
                const rows = (activity.questions || []).map((item, index) => {
                    const status = item.status || item.answer;
                    const reasonsStr = getReasons(item);
                    const remarkStr = getRemark(item);
                    const beforePhoto = buildUrl(item.photo_url || item.before_photo_url || item.beforeImage);
                    const afterPhoto = buildUrl(item.after_photo_url || item.afterImage);
                    
                    const isDeficiency = status === 'DEFICIENCY' || status === 'NO' || status === 'FAIL';
                    const isOk = status === 'OK' || status === 'YES' || status === 'PASS';

                    return `
                        <tr>
                            <td style="text-align: center;">${index + 1}</td>
                            <td>${item.questionText || item.question_text_snapshot || 'N/A'}</td>
                            <td style="text-align: center; color: ${isDeficiency ? '#ef4444' : (isOk ? '#10b981' : '#64748b')}; font-weight: bold;">
                                ${status}
                            </td>
                            <td>${reasonsStr}</td>
                            <td>${remarkStr || '-'}</td>
                            <td style="text-align: center; font-size: 9px;">
                                ${item.resolved ? '<span style="color: #10b981; font-weight: bold;">RESOLVED</span>' : '<span style="color: #f59e0b; font-weight: bold;">OPEN</span>'}
                            </td>
                            <td style="text-align: center;">
                                ${beforePhoto ? `<img src="${beforePhoto}" width="100" style="border: 1px solid #cbd5e1; border-radius: 4px;" />` : '-'}
                            </td>
                            <td style="text-align: center;">
                                ${afterPhoto ? `<img src="${afterPhoto}" width="100" style="border: 1px solid #10b981; border-radius: 4px;" />` : '-'}
                            </td>
                        </tr>
                    `;
                }).join('');

                return `
                    <div style="margin-top: 15px;">
                        <div style="background-color: #f8fafc; padding: 6px 12px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 11px; text-transform: uppercase; color: #475569; border-left: 4px solid #94a3b8; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 10px;">ACTIVITY:</span> ${activity.title}
                        </div>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed;">
                            <thead>
                                <tr>
                                    <th style="width: 7%; border: 1px solid #94a3b8; padding: 6px; background-color: #f1f5f9; font-size: 8px;">#</th>
                                    <th style="width: 25%; border: 1px solid #94a3b8; padding: 6px; background-color: #f1f5f9; font-size: 8px;">QUESTION</th>
                                    <th style="width: 9%; border: 1px solid #94a3b8; padding: 6px; background-color: #f1f5f9; font-size: 8px;">OBS.</th>
                                    <th style="width: 13%; border: 1px solid #94a3b8; padding: 6px; background-color: #f1f5f9; font-size: 8px;">REASONS</th>
                                    <th style="width: 13%; border: 1px solid #94a3b8; padding: 6px; background-color: #f1f5f9; font-size: 8px;">REMARKS</th>
                                    <th style="width: 9%; border: 1px solid #94a3b8; padding: 6px; background-color: #f1f5f9; font-size: 8px;">STATUS</th>
                                    <th style="width: 12%; border: 1px solid #94a3b8; padding: 6px; background-color: #f1f5f9; font-size: 8px;">BEFORE</th>
                                    <th style="width: 12%; border: 1px solid #94a3b8; padding: 6px; background-color: #f1f5f9; font-size: 8px;">AFTER</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                `;
            }).join('');

            return `
                <div class="area-section">
                    <h2 style="font-size: 13px; background-color: #e2e8f0; padding: 8px 12px; border-left: 6px solid #2563eb; margin: 25px 0 10px 0; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">AREA: ${area.title}</h2>
                    ${activitiesHtml}
                </div>
            `;
        }).join('');

        return `
            <html>
                <head>
                    <style>
                        @page { margin: 12mm; }
                        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 11px; }
                        .header { text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 8px; margin-bottom: 20px; }
                        .header h1 { margin: 5px 0; font-size: 20px; text-transform: uppercase; color: #000; letter-spacing: 1px; }
                        .header p { margin: 2px 0; font-size: 12px; font-weight: bold; color: #475569; }
                        .meta-table { width: 100%; margin-bottom: 20px; border: none; }
                        .meta-table td { border: none; padding: 4px 0; font-size: 12px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #94a3b8; padding: 8px; text-align: left; word-wrap: break-word; font-size: 10px; }
                        .footer { margin-top: 40px; border-top: 1px solid #94a3b8; padding-top: 15px; font-size: 9px; color: #64748b; }
                        .sig-table { width: 100%; margin-top: 30px; border: none; }
                        .sig-table td { border: none; width: 45%; padding-top: 40px; text-align: center; border-top: 1px solid #000; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Indian Railways</h1>
                        <p>Inspection Report - ${categoryName}</p>
                    </div>
                    <table class="meta-table">
                        <tr>
                            <td><strong>Train No:</strong> ${train_number}</td>
                            <td style="text-align: right;"><strong>Coach No:</strong> ${coach_number}</td>
                        </tr>
                        <tr>
                            <td><strong>Inspector:</strong> ${user_name}</td>
                            <td style="text-align: right;"><strong>Date:</strong> ${date}</td>
                        </tr>
                        <tr>
                            <td><strong>Submission ID:</strong> #${submission_id}</td>
                            <td style="text-align: right; color: ${stats?.compliance < 80 ? '#ef4444' : '#10b981'}; font-weight: bold; font-size: 14px;">
                                Compliance Score: ${stats?.compliance || 0}%
                            </td>
                        </tr>
                    </table>
                    ${sectionsHtml}
                    <div class="footer">
                        <p>* This is an electronically generated report. Authenticity can be verified via the QR/Submission ID.</p>
                        <table class="sig-table" style="margin-top: 60px;">
                            <tr>
                                <td>Inspector Signature</td>
                                <td style="width: 10%; border-top: none;"></td>
                                <td>Supervisor Signature</td>
                            </tr>
                        </table>
                    </div>
                </body>
            </html>
        `;
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const html = generateHtml();
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (err) {
            Alert.alert('Error', 'Failed to export PDF');
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            const html = generateHtml();
            const { uri } = await Print.printToFileAsync({ html });
            const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (!permissions.granted) {
                Alert.alert('Permission Denied', 'Unable to save to device storage without permission.');
                return;
            }
            const response = await fetch(uri);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result);
            });
            const base64data = reader.result.replace(/^data:.+;base64,/, '');
            const safeTrain = String(train_number || 'NA').replace(/[^a-zA-Z0-9]/g, '_');
            const safeCoach = String(coach_number || 'NA').replace(/[^a-zA-Z0-9]/g, '_');
            const subStr = String(submission_id || 'UNKNOWN').substring(0, 8);
            const fileName = `Report_${safeTrain}_${safeCoach}_${subStr}.pdf`;
            const safUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, 'application/pdf');
            await StorageAccessFramework.writeAsStringAsync(safUri, base64data, { encoding: FileSystem.EncodingType.Base64 });
            Alert.alert('Download Complete', 'PDF saved successfully.');
        } catch (err) {
            Alert.alert('Error', 'Failed to download PDF.');
        } finally {
            setIsDownloading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title="Report Details"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.headerInfo}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{categoryName}</Text>
                    <Text style={styles.sub}>{train_number} - {coach_number}</Text>
                    <Text style={styles.sub}>{date} • {user_name}</Text>
                </View>
            </View>

            <View style={styles.actionsContainer}>
                <TouchableOpacity style={[styles.actionBtn, styles.exportBtn]} onPress={handleExport} disabled={isExporting}>
                    {isExporting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>Export PDF</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.downloadBtn]} onPress={handleDownload} disabled={isDownloading}>
                    {isDownloading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>Save to Device</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.officialHeader}>
                    <Text style={styles.headerOrg}>Indian Railways</Text>
                    <Text style={styles.railwayText}>Inspection Report</Text>
                    {stats && (
                        <View style={styles.statsSummary}>
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryLabel}>COMPLIANCE</Text>
                                <Text style={[styles.summaryValue, { color: stats.compliance < 80 ? '#ef4444' : '#10b981' }]}>{stats.compliance}%</Text>
                            </View>
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryLabel}>OK / DEF / NA</Text>
                                <Text style={styles.summaryValue}>{stats.yes_count} / {stats.no_count} / {stats.na_count}</Text>
                            </View>
                        </View>
                    )}
                    <View style={styles.thickDivider} />
                </View>

                {(details || []).map((area, areaIdx) => (
                    <View key={areaIdx} style={styles.activityContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>AREA: {area.title}</Text>
                        </View>
                        {(area.activities || []).map((activity, actIdx) => (
                            <View key={actIdx} style={styles.itemRefContainer}>
                                <View style={styles.itemRefHeader}>
                                    <Text style={styles.itemRefHeaderText}>ACTIVITY: {activity.title}</Text>
                                </View>
                                <View style={styles.table}>
                                    <View style={styles.tableHeaderRow}>
                                        <View style={[styles.cell, { flex: 0.1 }]}><Text style={styles.tableHeaderText}>#</Text></View>
                                        <View style={[styles.cell, { flex: 0.45 }]}><Text style={styles.tableHeaderText}>Question</Text></View>
                                        <View style={[styles.cell, { flex: 0.15 }]}><Text style={styles.tableHeaderText}>Obs.</Text></View>
                                        <View style={[styles.cell, { flex: 0.3 }]}><Text style={styles.tableHeaderText}>Remarks</Text></View>
                                    </View>
                                    {(activity.questions || []).map((item, idx) => {
                                        const reasonsStr = getReasons(item);
                                        const remarkStr = getRemark(item);
                                        
                                        const beforeUri = buildUrl(item.photo_url || item.before_photo_url || item.beforeImage);
                                        const afterUri = buildUrl(item.after_photo_url || item.afterImage);

                                        return (
                                            <View key={item.id || idx} style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: '#F8FAFC' }, { flexDirection: 'column', minHeight: 0 }]}>
                                                <View style={{ flexDirection: 'row' }}>
                                                    <View style={[styles.cell, { flex: 0.1 }]}><Text style={styles.cellTextCenter}>{idx + 1}</Text></View>
                                                    <View style={[styles.cell, { flex: 0.5 }]}><Text style={styles.cellText}>{item.questionText || item.question_text_snapshot || 'N/A'}</Text></View>
                                                    <View style={[styles.cell, { flex: 0.2 }]}><Text style={[
                                                        styles.cellTextCenter,
                                                        {
                                                            fontWeight: 'bold',
                                                            color: (item.status === 'DEFICIENCY' || item.answer === 'NO') ? '#ef4444' :
                                                                (item.status === 'OK' || item.answer === 'YES') ? '#10b981' : '#64748b'
                                                        }
                                                    ]}>
                                                        {item.status || item.answer}
                                                    </Text></View>
                                                    <View style={[styles.cell, { flex: 0.2, borderRightWidth: 0 }]}>
                                                        <View style={[styles.statusBadge, { backgroundColor: item.resolved ? '#10b981' : '#f59e0b' }]}>
                                                            <Text style={styles.statusBadgeText}>{item.resolved ? 'RESOLVED' : 'OPEN'}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                {(reasonsStr !== '-' || remarkStr) && (
                                                    <View style={{ padding: 10, backgroundColor: 'rgba(0,0,0,0.02)', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                                                        {reasonsStr !== '-' && <Text style={styles.cellRemarkText}><Text style={{ fontWeight: 'bold' }}>Reasons:</Text> {reasonsStr}</Text>}
                                                        {remarkStr && <Text style={styles.cellRemarkText}><Text style={{ fontWeight: 'bold' }}>Remarks:</Text> {remarkStr}</Text>}
                                                    </View>
                                                )}
                                                {(beforeUri || afterUri) && (
                                                    <View style={{ flexDirection: 'row', padding: 10, gap: 12 }}>
                                                        {beforeUri && (
                                                            <View>
                                                                <Image source={{ uri: beforeUri }} style={styles.thumbnail} />
                                                                <Text style={styles.thumbLabel}>BEFORE</Text>
                                                            </View>
                                                        )}
                                                        {afterUri && (
                                                            <View>
                                                                <Image source={{ uri: afterUri }} style={[styles.thumbnail, { borderColor: '#10b981' }]} />
                                                                <Text style={[styles.thumbLabel, { color: '#10b981' }]}>AFTER</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    headerInfo: { flexDirection: 'row', padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
    title: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    sub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
    actionsContainer: { flexDirection: 'row', padding: 12, gap: 10 },
    actionBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', elevation: 2 },
    exportBtn: { backgroundColor: COLORS.primary },
    downloadBtn: { backgroundColor: COLORS.success },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    content: { padding: 16 },
    officialHeader: { alignItems: 'center', marginBottom: 20 },
    headerOrg: { fontSize: 12, color: COLORS.textSecondary, fontWeight: 'bold' },
    railwayText: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
    thickDivider: { height: 3, backgroundColor: COLORS.textPrimary, width: '100%', marginTop: 10 },
    activityContainer: { marginBottom: 25 },
    sectionHeader: { backgroundColor: '#F1F5F9', padding: 10, borderLeftWidth: 4, borderLeftColor: COLORS.primary, marginBottom: 5 },
    sectionHeaderText: { fontWeight: 'bold', color: COLORS.textPrimary, fontSize: 14 },
    itemRefContainer: { marginTop: 15, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
    itemRefHeader: { backgroundColor: '#334155', padding: 8, paddingHorizontal: 12 },
    itemRefHeaderText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    table: { backgroundColor: COLORS.surface },
    tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', minHeight: 45 },
    tableHeaderText: { fontSize: 10, fontWeight: 'bold', color: COLORS.textSecondary, textAlign: 'center' },
    cell: { padding: 10, justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#F1F5F9' },
    cellText: { fontSize: 11, color: COLORS.textPrimary, lineHeight: 16 },
    cellTextCenter: { fontSize: 11, color: COLORS.textPrimary, textAlign: 'center' },
    cellRemarkText: { fontSize: 10, color: COLORS.textSecondary },
    statsSummary: { flexDirection: 'row', gap: 16, marginTop: 15, width: '100%', justifyContent: 'center' },
    summaryBox: { alignItems: 'center', backgroundColor: COLORS.surface, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, minWidth: 110, elevation: 1 },
    summaryLabel: { fontSize: 9, fontWeight: 'bold', color: COLORS.textSecondary, marginBottom: 4 },
    summaryValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
    thumbnail: { width: 80, height: 60, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
    thumbLabel: { fontSize: 8, fontWeight: 'bold', color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
    statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'center' },
    statusBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' }
});

export default ReportDetailScreen;
