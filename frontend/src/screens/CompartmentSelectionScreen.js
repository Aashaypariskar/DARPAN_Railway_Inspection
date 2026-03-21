import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';
import { getReports } from '../api/api';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';
const CompartmentSelectionScreen = ({ route, navigation }) => {
    const params = route.params;
    const { setDraft } = useStore();
    const [existingReports, setExistingReports] = useState({ major: 0, minor: 0 });
    const [compartments, setCompartments] = useState([]);
    const [loading, setLoading] = useState(true);

    const isCommissionary = params.module_type === 'COMMISSIONARY';
    const isLavatory = (params.subcategory_name || params.subcategoryName)?.toLowerCase().includes('lavatory');

    function getCompartments(subcategoryName) {
        const name = subcategoryName?.toLowerCase() || '';
        if (name.includes('lavatory')) return ['L1', 'L2', 'L3', 'L4'];
        if (name.includes('door')) return ['D1', 'D2', 'D3', 'D4'];
        return [];
    }

    useEffect(() => {
        setCompartments(getCompartments(params.subcategory_name || params.subcategoryName));
        if (!isCommissionary) {
            checkExistingReports();
        } else {
            setLoading(false);
        }
    }, [params.subcategory_name || params.subcategoryName]);

    const checkExistingReports = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const result = await getReports({
                coach_no: params.coach_number || params.coachNumber,
                start_date: today,
                end_date: today
            });

            // Filter for reports matching current subcategory and activity types (case-insensitive)
            const currentSubBase = (params.subcategory_name || params.subcategoryName)?.split(' [')[0].toLowerCase();

            const reports = result?.data || [];

            const matches = reports.filter(r => {
                const rSubBase = r.subcategory_name?.split(' [')[0].toLowerCase();
                return rSubBase === currentSubBase && r.subcategory_name?.includes('[');
            });

            const majorCount = matches.filter(r => r.severity === 'Major').length;
            const minorCount = matches.filter(r => r.severity === 'Minor').length;

            setExistingReports({ major: majorCount, minor: minorCount });
        } catch (err) {
            console.error('Error checking existing reports:', err);
        } finally {
            setLoading(false);
        }
    };

    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                !isCommissionary ? (
                    <TouchableOpacity
                        style={{ marginRight: 15, backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
                        onPress={() => navigation.navigate('CombinedSummary', { ...params })}
                    >
                        <Text style={{ color: '#2563eb', fontWeight: 'bold', fontSize: 12 }}>Summary</Text>
                    </TouchableOpacity>
                ) : null
            )
        });
    }, [navigation, params]);

    const handleSelect = (comp) => {
        setDraft(prev => ({
            ...prev,
            compartment: comp
        }));

        const navParams = {
            ...params,
            compartment_id: comp,
            status: params.status
        };

        if (isCommissionary) {
            navigation.navigate('CommissionaryQuestions', navParams);
            return;
        }

        navigation.navigate('ActivitySelection', navParams);
    };

    return (
        <View style={styles.container}>
            <AppHeader
                title="Select Compartment"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
                rightComponent={!isCommissionary && (
                    <TouchableOpacity
                        style={styles.headerSummaryBtn}
                        onPress={() => navigation.navigate('CombinedSummary', { ...params })}
                    >
                        <Text style={styles.headerSummaryText}>Summary</Text>
                    </TouchableOpacity>
                )}
            />

            <View style={styles.content}>
                <View style={styles.pills}>
                    <View style={styles.pill}><Text style={styles.pillText}>COACH: {params.coach_number || params.coachNumber}</Text></View>
                    <View style={[styles.pill, styles.activePill]}>
                        <Text style={[styles.pillText, { color: '#fff' }]}>
                            {(() => {
                                const sub_name = params.subcategory_name || params.subcategoryName;
                                return sub_name;
                            })()}
                        </Text>
                    </View>
                </View>

                <Text style={styles.title}>Select Compartment</Text>
                <Text style={styles.subtitle}>Choose a location to begin inspection</Text>

                <FlatList
                    data={compartments}
                    keyExtractor={(item) => item}
                    numColumns={2}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.compCard}
                            onPress={() => handleSelect(item)}
                        >
                            <View style={styles.iconBox}>
                                <Ionicons
                                    name={isLavatory ? "water-outline" : "exit-outline"}
                                    size={24}
                                    color={COLORS.primary}
                                />
                            </View>
                            <Text style={styles.compName}>{item}</Text>
                            <Text style={styles.compLabel}>Tap to start inspection</Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.list}
                    columnWrapperStyle={styles.gridRow}
                    ListFooterComponent={() => (
                        <View style={styles.summarySection}>
                            <View style={styles.divider} />
                            <Text style={styles.summaryTitle}>Area Summary</Text>
                            <Text style={styles.summarySubtitle}>Combined reporting for all compartments</Text>

                            {loading ? (
                                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
                            ) : (
                                <View style={styles.summaryActions}>
                                    {existingReports.major >= 2 ? (
                                        <TouchableOpacity
                                            style={[styles.combinedBtn, { backgroundColor: COLORS.error }]}
                                            onPress={() => navigation.navigate('CombinedReport', {
                                                coach_id: params.coach_id || params.coachId,
                                                subcategory_id: params.subcategory_id || params.subcategoryId,
                                                activity_type: 'Major',
                                                date: new Date().toISOString().split('T')[0]
                                            })}
                                        >
                                            <Ionicons name="grid-outline" size={18} color="#fff" />
                                            <Text style={styles.combinedBtnText}>
                                                View Combined Major Report {existingReports.major < 4 ? '(Partial)' : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    ) : null}

                                    {existingReports.minor >= 2 ? (
                                        <TouchableOpacity
                                            style={[styles.combinedBtn, { backgroundColor: COLORS.warning }]}
                                            onPress={() => navigation.navigate('CombinedReport', {
                                                coach_id: params.coach_id || params.coachId,
                                                subcategory_id: params.subcategory_id || params.subcategoryId,
                                                activity_type: 'Minor',
                                                date: new Date().toISOString().split('T')[0]
                                            })}
                                        >
                                            <Ionicons name="grid-outline" size={18} color="#fff" />
                                            <Text style={styles.combinedBtnText}>
                                                View Combined Minor Report {existingReports.minor < 4 ? '(Partial)' : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    ) : null}

                                    {existingReports.major < 2 && existingReports.minor < 2 && (
                                        <View style={styles.infoBox}>
                                            <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
                                            <Text style={styles.infoText}>
                                                Complete at least 2 compartments to view combined report
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    )}
                />
            </View >
        </View >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, paddingHorizontal: SPACING.xl },
    pills: { flexDirection: 'row', marginBottom: SPACING.lg, gap: SPACING.sm, paddingTop: SPACING.md },
    pill: { backgroundColor: COLORS.disabled, paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.md },
    activePill: { backgroundColor: COLORS.secondary },
    pillText: { fontSize: 11, fontWeight: 'bold', color: COLORS.textSecondary },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.md },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xxl },
    list: { paddingBottom: 40 },
    gridRow: { justifyContent: 'space-between', marginBottom: SPACING.md },
    compCard: {
        width: '48%',
        aspectRatio: 1.2,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    iconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    compName: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
    compLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
    headerSummaryBtn: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.secondary
    },
    headerSummaryText: { color: COLORS.secondary, fontWeight: 'bold', fontSize: 12 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summarySection: { marginTop: 20, paddingBottom: 40 },
    summaryTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.xs },
    summarySubtitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 20 },
    summaryActions: { gap: 12 },
    combinedBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: RADIUS.lg, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    combinedBtnText: { color: COLORS.surface, fontSize: 14, fontWeight: 'bold', marginLeft: 10 },
    infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.disabled, padding: 15, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
    infoText: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 10, flex: 1 }
});

export default CompartmentSelectionScreen;
