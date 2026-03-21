import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { getCombinedSummary } from '../api/api';
import { Ionicons } from '@expo/vector-icons';

const CombinedSummaryScreen = ({ route, navigation }) => {
    const params = route.params;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSummary();
    }, []);

    const loadSummary = async () => {
        try {
            const result = await getCombinedSummary(params.scheduleId || params.schedule_id, params.subcategoryName || params.subcategory_name);
            setData(result);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch summary');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    if (!data) return <View style={styles.center}><Text>No data found.</Text></View>;

    const compartments = Object.keys(data).filter(k => k !== 'total');

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Text style={styles.title}>{params.subcategoryName} Summary</Text>
                    <Text style={styles.sub}>Combined Compartment Report</Text>
                </View>

                {compartments.map(comp => (
                    <View key={comp} style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="apps-outline" size={20} color="#2563eb" />
                            <Text style={styles.compTitle}>Compartment {comp}</Text>
                        </View>
                        <View style={styles.statsRow}>
                            <View style={styles.stat}>
                                <Text style={styles.statLabel}>Major Issues</Text>
                                <Text style={[styles.statValue, { color: '#ef4444' }]}>{data[comp].Major}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.stat}>
                                <Text style={styles.statLabel}>Minor Issues</Text>
                                <Text style={[styles.statValue, { color: '#f59e0b' }]}>{data[comp].Minor}</Text>
                            </View>
                        </View>
                    </View>
                ))}

                <View style={[styles.card, styles.totalCard]}>
                    <Text style={styles.totalTitle}>OVERALL TOTALS</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>Total Major</Text>
                            <Text style={[styles.statValue, { fontSize: 24, color: '#ef4444' }]}>{data.total.Major}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>Total Minor</Text>
                            <Text style={[styles.statValue, { fontSize: 24, color: '#f59e0b' }]}>{data.total.Minor}</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={styles.refreshBtn} onPress={loadSummary}>
                    <Text style={styles.refreshText}>Refresh Report</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scroll: { padding: 20 },
    header: { marginBottom: 25 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
    sub: { fontSize: 14, color: '#64748b', marginTop: 4 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10 },
    compTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginLeft: 10 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    stat: { alignItems: 'center', flex: 1 },
    statLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
    statValue: { fontSize: 20, fontWeight: 'bold' },
    divider: { width: 1, height: 30, backgroundColor: '#e2e8f0' },
    totalCard: { backgroundColor: '#1e293b', marginTop: 10 },
    totalTitle: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, letterSpacing: 1 },
    refreshBtn: { paddingVertical: 15, alignItems: 'center', marginTop: 10 },
    refreshText: { color: '#2563eb', fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CombinedSummaryScreen;
