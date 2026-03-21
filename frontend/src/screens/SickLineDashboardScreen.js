import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { getAmenitySubcategories, getInspectionProgress, completeSickLineSession, getWspProgress } from '../api/api';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const SickLineDashboardScreen = ({ route, navigation }) => {
    const params = route.params || {};
    
    // Phase 2: Navigation Parameter Normalization
    const coach_id = params.coach_id || params.coachId || params.coach_id;
    const coach_number = params.coach_number || params.coachNumber;
    const session_id = params.session_id || params.sessionId;
    const category_name = params.category_name || params.categoryName;

    const normalizedParams = {
        ...params,
        coach_id,
        coach_number,
        session_id,
        category_name
    };

    const [subcategories, setSubcategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(null);
    const [wspProgress, setWspProgress] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const { setDraft, draft } = useStore();

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            const [data, prog] = await Promise.all([
                getAmenitySubcategories('Amenity', 1),
                getInspectionProgress({
                    session_id: session_id,
                    module_type: 'SICKLINE'
                }),
            ]);

            try {
                const wspProg = await getWspProgress(params.coachNumber, 'SICKLINE');
                setWspProgress(wspProg);
            } catch (err) {
                console.log('WSP Progress load error:', err);
                setWspProgress({ completedCount: 0, totalCount: 0, completed: false }); // Safe default
            }

            setSubcategories(data);
            setProgress(prog);
        } catch (err) {
            console.log('SickLine Dashboard Load Error:', err);
            Alert.alert('Error', 'Could not fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalSubmit = async () => {
        if (!progress?.fully_complete) {
            Alert.alert('Incomplete', 'Please complete all areas (Major & Minor) before submitting.');
            return;
        }

        Alert.alert('Final Submission', 'Are you sure you want to complete this Sick Line inspection? This will lock all records.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Submit',
                onPress: async () => {
                    try {
                        setSubmitting(true);
                        await completeSickLineSession(params.coachNumber);
                        Alert.alert('Success', 'Sick Line Inspection COMPLETED!', [
                            { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
                        ]);
                    } catch (err) {
                        Alert.alert('Error', 'Submission failed');
                    } finally {
                        setSubmitting(false);
                    }
                }
            }
        ]);
    };

    const handleSelect = (sub, index) => {
        if (sub.isWsp) {
            handleWspCardPress();
            return;
        }
        setDraft(prev => ({
            ...prev,
            subcategory_id: sub.id,
            subcategory_name: sub.name
        }));

        navigation.navigate('SickLineQuestions', {
            ...params,
            sessionId: progress?.session_id || params.sessionId,
            subcategoryId: sub.id,
            subcategoryName: sub.name,
            status: progress?.status || params.status,
            subcategories,
            currentIndex: index
        });
    };

    const handleWspCardPress = () => {
        navigation.navigate('WspScheduleScreen', {
            mode: 'SICKLINE',
            sickLineSessionId: progress?.session_id || params.sessionId,
            coachId: params.coachId,
            coachNumber: params.coachNumber,
            categoryName: 'WSP Examination'
        });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>;

    // Prepend WSP as a virtual subcategory for the grid
    const gridData = [{ id: 'wsp', name: 'WSP Examination', isWsp: true }, ...subcategories];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back-outline" size={26} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.pills}>
                    <View style={styles.pill}><Text style={styles.pillText}>COACH: {params.coachNumber}</Text></View>
                    <View style={[styles.pill, styles.activePill]}><Text style={[styles.pillText, { color: '#fff' }]}>{params.categoryName}</Text></View>
                </View>
                <View style={{ width: 26 }} />
            </View>

            <Text style={styles.title}>Select Area</Text>
            <Text style={styles.subtitle}>Choose an area for Sick Line inspection</Text>

            <FlatList
                data={gridData}
                keyExtractor={(item, index) => (item?.id || index).toString()}
                numColumns={2}
                renderItem={({ item, index }) => {
                    let badgeText = "Pending";
                    let badgeColor = COLORS.muted;
                    let iconName = "build-outline";
                    let iconColor = COLORS.secondary;

                    if (item.isWsp) {
                        iconName = "shield-checkmark-outline";
                        iconColor = COLORS.textPrimary;
                        const isWspComplete = wspProgress?.totalCount > 0 && wspProgress?.completedCount === wspProgress?.totalCount;
                        if (isWspComplete) {
                            badgeText = "Completed";
                            badgeColor = COLORS.success;
                        } else if (wspProgress?.completedCount > 0) {
                            badgeText = "Partial";
                            badgeColor = COLORS.warning;
                        }
                    } else {
                        const status = progress?.perSubcategoryStatus?.find(s => s.id === item.id);
                        
                        // Local Answer Reconciliation for real-time badges
                        let answeredCount = status?.answered || 0;
                        const totalCount = status?.total || 0;

                        if (draft.subcategory_id === item.id) {
                            answeredCount = Math.max(answeredCount, Object.keys(draft.answers || {}).length);
                        }

                        const isComplete = totalCount > 0 && answeredCount >= totalCount;
                        const isPartial = answeredCount > 0 && answeredCount < totalCount;

                        if (isComplete) {
                            badgeText = "Completed";
                            badgeColor = COLORS.success;
                        } else if (isPartial) {
                            badgeText = "Partial";
                            badgeColor = COLORS.warning;
                        }
                    }

                    return (
                        <TouchableOpacity
                            style={styles.subCard}
                            onPress={() => handleSelect(item, index)}
                        >
                            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                                <Ionicons 
                                    name={badgeText === 'Completed' ? "checkmark-circle" : (badgeText === 'Partial' ? "time" : (badgeText.includes('Defects') ? "warning" : "ellipse"))} 
                                    size={10} 
                                    color="#fff" 
                                />
                                <Text style={styles.badgeText}>{badgeText}</Text>
                            </View>
                            <View style={[styles.iconBox, item.isWsp && { backgroundColor: '#f1f5f9' }]}>
                                <Ionicons name={iconName} size={24} color={iconColor} />
                            </View>
                            <Text style={styles.subName}>{item.name}</Text>

                            {badgeColor === '#ef4444' && !item.isWsp && (
                                <TouchableOpacity
                                    style={styles.fixBtn}
                                    onPress={() => navigation.navigate('Defects', {
                                        session_id: progress?.session_id || params.sessionId,
                                        module_type: 'sickline',
                                        coach_number: params.coachNumber
                                    })}
                                >
                                    <Text style={styles.fixBtnText}>FIX DEFECTS</Text>
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={styles.list}
                ListFooterComponent={() => (
                    progress ? (
                        <View style={styles.footer}>
                            <View style={styles.progressCard}>
                                <Text style={styles.progressTitle}>Global Progress</Text>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${progress.progress_percentage || 0}%` }]} />
                                </View>
                                <Text style={styles.progressText}>
                                    {progress.completed_count} / {progress.total_expected} Areas Fully Completed
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.submitBtn,
                                    (!progress.fully_complete || submitting) && { backgroundColor: '#94a3b8' }
                                ]}
                                onPress={handleFinalSubmit}
                                disabled={!progress.fully_complete || submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-done-circle-outline" size={24} color="#fff" />
                                        <Text style={styles.submitBtnText}>Final Session Submit</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : null
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.xl },
    pills: { flexDirection: 'row', marginBottom: SPACING.xl },
    pill: { backgroundColor: COLORS.mutedLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, marginRight: 8 },
    activePill: { backgroundColor: COLORS.secondary },
    pillText: { fontSize: 10, fontWeight: 'bold', color: COLORS.textSecondary },
    title: { fontSize: 26, fontWeight: 'bold', color: COLORS.textPrimary },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 30 },
    list: { paddingBottom: SPACING.xl },
    subCard: { flex: 1, backgroundColor: COLORS.card, margin: 6, padding: SPACING.xl, borderRadius: 14, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, minHeight: 140 },
    iconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
    subName: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xl },
    footer: { marginTop: SPACING.xl, paddingBottom: 40 },
    progressCard: { backgroundColor: COLORS.card, padding: SPACING.xl, borderRadius: RADIUS.lg, marginBottom: SPACING.md, elevation: 2 },
    progressTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.sm },
    progressBar: { height: 8, backgroundColor: COLORS.mutedLight, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: '100%', backgroundColor: COLORS.success },
    progressText: { fontSize: 12, color: COLORS.textSecondary },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.success, height: 48, borderRadius: 10, elevation: 4 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: SPACING.sm },
    badge: { 
        position: 'absolute', 
        top: 12, 
        right: 12, 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: RADIUS.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    wspCard: {
        backgroundColor: COLORS.card,
        marginHorizontal: 6,
        marginVertical: 10,
        padding: SPACING.xl,
        borderRadius: RADIUS.xl,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    wspIconBox: {
        width: 60,
        height: 60,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.textPrimary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    wspContent: { flex: 1 },
    wspName: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    wspSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.xl, marginVertical: SPACING.md },
    fixBtn: {
        marginTop: 10,
        backgroundColor: COLORS.dangerLight,
        borderWidth: 1,
        borderColor: COLORS.danger,
        borderRadius: RADIUS.sm,
        paddingVertical: 4,
        paddingHorizontal: 12,
    },
    fixBtnText: { fontSize: 10, fontWeight: '900', color: COLORS.danger },
});

export default SickLineDashboardScreen;
