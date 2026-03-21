import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert, Modal, Animated } from 'react-native';
import { getAmenitySubcategories, getCommissionaryProgress, completeCommissionarySession } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const CommissionaryDashboardScreen = ({ route, navigation }) => {
    const { sessionId, coachNumber, compartmentId, status } = route.params;
    const [progressStats, setProgressStats] = useState({ completed_count: 0, total_expected: 0, fully_complete: false, status: 'IN_PROGRESS' });
    const [subcategories, setSubcategories] = useState([]);
    const [progress, setProgress] = useState(null);
    const [breakdown, setBreakdown] = useState({});
    const [loading, setLoading] = useState(true);
    const [finalizing, setFinalizing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const progressAnim = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    useEffect(() => {
        const percentage = progressStats.total_expected > 0
            ? progressStats.completed_count / progressStats.total_expected
            : 0;
        console.log(`[DEBUG] Dashboard Progress Update: ${progressStats.completed_count}/${progressStats.total_expected} (${(percentage * 100).toFixed(2)}%)`);
        Animated.timing(progressAnim, {
            toValue: percentage,
            duration: 800,
            useNativeDriver: false
        }).start();
    }, [progressStats.completed_count, progressStats.total_expected]);

    const loadData = async () => {
        try {
            const categoryFetchName = route.params?.categoryName || 'Coach Commissionary';
            const [subs, progData] = await Promise.all([
                getAmenitySubcategories(categoryFetchName, 1),
                getCommissionaryProgress(coachNumber, 'COMMISSIONARY')
            ]);
            const data = progData.data || progData;
            console.log('[DEBUG] Dashboard loadData success:', data.completed_count, '/', data.total_expected, 'fully_complete:', data.fully_complete);
            setSubcategories(subs);
            setProgress(data);
            setProgressStats(prev => ({
                ...prev,
                session_id: data.session_id,
                completed_count: data.completed_count ?? 0,
                total_expected: data.total_expected ?? subs.length,
                fully_complete: data.fully_complete ?? false,
                status: data.status || prev.status
            }));
        } catch (err) {
            console.error('[DEBUG] Dashboard loadData error:', err);
            Alert.alert('Error', 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        try {
            setFinalizing(true);
            await completeCommissionarySession(coachNumber, 'COMMISSIONARY');
            setShowModal(false);
            Alert.alert('Success', 'Inspection Finalized Successfully', [
                { text: 'OK', onPress: () => navigation.navigate('History') }
            ]);
        } catch (err) {
            Alert.alert('Error', 'Failed to finalize session');
        } finally {
            setFinalizing(false);
        }
    };

    const handleSelect = (sub, index) => {
        navigation.navigate('CommissionaryQuestions', {
            session_id: progressStats.session_id || sessionId,
            sessionId: progressStats.session_id || sessionId,
            coach_number: coachNumber,
            coachNumber,
            coach_id: route.params.coachId || route.params.coach_id,
            coachId: route.params.coachId || route.params.coach_id,
            compartment_id: compartmentId || 'NA',
            compartmentId: compartmentId || 'NA',
            subcategory_id: sub.id,
            subcategoryId: sub.id,
            subcategory_name: sub.name,
            subcategoryName: sub.name,
            category_name: route.params?.categoryName || 'Coach Commissionary',
            categoryName: route.params?.categoryName || 'Coach Commissionary',
            status: progressStats.status,
            module_type: 'COMMISSIONARY',
            subcategories,
            currentIndex: index
        });
    };

    const renderItem = ({ item, index }) => {
        const areaStatus = progress?.perAreaStatus?.find(p => p.id === item.id) || progress?.progress?.find(p => p.id === item.id);
        
        // This screen uses compartment-specific progress usually, 
        // but the universal API currently provides subcategory-level stats.
        // We'll map the universal status to the UI badges.
        
        const isComplete = areaStatus?.completed || false;
        const answered = areaStatus?.answered || 0;
        const total = areaStatus?.total || 0;
        const isPartial = !isComplete && answered > 0;

        let badgeText = "Pending";
        let badgeColor = COLORS.muted;
        // Calculate missing variables using areaStatus
        // N/A rule: if there are 0 questions of a type, that type is considered "done" (not applicable)
        const isMinorDone = areaStatus ? (areaStatus.minorTotal === 0 || areaStatus.minorAnswered >= areaStatus.minorTotal) : false;
        const isMajorDone = areaStatus ? (areaStatus.majorTotal === 0 || areaStatus.majorAnswered >= areaStatus.majorTotal) : false;
        const hasMinorQuestions = areaStatus ? areaStatus.minorTotal > 0 : true;
        const hasMajorQuestions = areaStatus ? areaStatus.majorTotal > 0 : true;
        const bothDone = isComplete;
        const pendingDefects = areaStatus?.pendingDefects || 0;
        const hasDefects = pendingDefects > 0;

        if (isComplete) {
            badgeText = "Completed";
            badgeColor = COLORS.success;
        } else if (isPartial) {
            badgeText = "Partial";
            badgeColor = COLORS.warning;
        }

        if (hasDefects) {
            badgeText = `${pendingDefects} Defects`;
            badgeColor = COLORS.danger;
        }

        return (
            <TouchableOpacity
                style={[styles.card, bothDone && styles.cardComplete]}
                onPress={() => handleSelect(item, index)}
            >
                <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.badgeText}>{badgeText}</Text>
                </View>

                <View style={[styles.iconBox, bothDone && styles.iconBoxComplete]}>
                    <Ionicons
                        name={item.name.toLowerCase().includes('undergear') ? 'settings-outline' : 'cube-outline'}
                        size={24}
                        color={bothDone ? "#fff" : COLORS.secondary}
                    />
                </View>
                <Text style={styles.subName} numberOfLines={2}>{item.name}</Text>

                <View style={styles.indicators}>
                    {hasMinorQuestions && (
                        <View style={[styles.miniBadge, isMinorDone && styles.miniBadgeDone]}>
                            <Ionicons name={isMinorDone ? "checkmark-circle" : "close-circle"} size={10} color={isMinorDone ? "#fff" : "#94a3b8"} />
                            <Text style={[styles.miniBadgeText, isMinorDone && styles.miniBadgeTextDone]}>Minor</Text>
                        </View>
                    )}
                    {hasMajorQuestions && (
                        <View style={[styles.miniBadge, isMajorDone && styles.miniBadgeDone]}>
                            <Ionicons name={isMajorDone ? "checkmark-circle" : "close-circle"} size={10} color={isMajorDone ? "#fff" : "#94a3b8"} />
                            <Text style={[styles.miniBadgeText, isMajorDone && styles.miniBadgeTextDone]}>Major</Text>
                        </View>
                    )}
                </View>

                {hasDefects && (
                    <TouchableOpacity
                        style={styles.resolveAreaBtn}
                        onPress={() => navigation.navigate('Defects', {
                            session_id: progressStats.session_id || sessionId,
                            module_type: 'COMMISSIONARY',
                            coach_number: coachNumber
                        })}
                    >
                        <Text style={styles.resolveAreaBtnText}>FIX DEFECTS</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>;

    const progressPercent = progressStats.total_expected > 0
        ? Math.round((progressStats.completed_count / progressStats.total_expected) * 100)
        : 0;
    const canFinalize = progressStats.fully_complete === true || progressPercent >= 100;
    const isLocked = progressStats.status === 'COMPLETED';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back-outline" size={26} color={COLORS.textPrimary} />
                </TouchableOpacity>
                {isLocked && (
                    <View style={styles.lockedBadge}>
                        <Ionicons name="lock-closed" size={14} color="#fff" />
                        <Text style={styles.lockedText}>Locked</Text>
                    </View>
                )}
                <View style={styles.pills}>
                    <View style={styles.pill}><Text style={styles.pillText}>{coachNumber}</Text></View>
                    <View style={[styles.pill, { backgroundColor: COLORS.secondary }]}><Text style={[styles.pillText, { color: '#fff' }]}>{compartmentId}</Text></View>
                </View>
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressTitle}>Phase-wise Progress</Text>
                    <Text style={styles.progressValue}>{progressPercent}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <Animated.View
                        style={[
                            styles.progressBarFill,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%']
                                })
                            }
                        ]}
                    />
                </View>
                <Text style={styles.progressMeta}>
                    {progressStats.completed_count} / {progressStats.total_expected} Activity Blocks Completed
                </Text>
            </View>

            <Text style={styles.title}>Areas to Inspect</Text>
            <Text style={styles.subtitle}>Complete both Major and Minor for each area</Text>

            <FlatList
                data={subcategories}
                keyExtractor={(item, index) => (item?.id || index).toString()}
                numColumns={2}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.finalizeBtn, !canFinalize && !isLocked && styles.finalizeBtnDisabled, isLocked && { backgroundColor: COLORS.success }]}
                    onPress={() => isLocked ? null : setShowModal(true)}
                    disabled={!canFinalize || isLocked}
                >
                    <Ionicons name={isLocked ? "checkmark-done-circle" : "cloud-upload-outline"} size={20} color="#fff" />
                    <Text style={styles.finalizeBtnText}>
                        {isLocked ? "Inspection Completed" : "Finalize Inspection"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.backBtnInline}
                    onPress={() => navigation.navigate('AmenitySubcategory', { sessionId, coachId: route.params.coachId, coachNumber, categoryName: route.params.categoryName, status: progressStats.status })}
                >
                    <Text style={styles.backBtnTextInline}>Back</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={showModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconBox}>
                            <Ionicons name="alert-circle" size={40} color="#2563eb" />
                        </View>
                        <Text style={styles.modalTitle}>Confirm Final Submission</Text>
                        <Text style={styles.modalMsg}>
                            You have completed all inspection areas. After submission, this session will be locked and cannot be edited.
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleFinalize} disabled={finalizing}>
                                {finalizing ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Confirm & Submit</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.xl },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 40, marginBottom: SPACING.sm },
    pills: { flexDirection: 'row', gap: 6 },
    pill: { backgroundColor: COLORS.mutedLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
    pillText: { fontSize: 10, fontWeight: 'bold', color: COLORS.textSecondary },

    progressSection: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.xl, elevation: 2 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    progressTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary },
    progressValue: { fontSize: 16, fontWeight: '900', color: COLORS.secondary },
    progressBarBg: { height: 8, backgroundColor: COLORS.mutedLight, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: COLORS.secondary },
    progressMeta: { fontSize: 10, color: COLORS.muted, marginTop: 8, textAlign: 'right', fontWeight: 'bold' },

    title: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
    subtitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.md },
    list: { paddingBottom: 120 },

    card: {
        flex: 1,
        backgroundColor: COLORS.card,
        margin: 6,
        padding: SPACING.md,
        borderRadius: 14,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        position: 'relative',
        overflow: 'hidden',
    },
    cardComplete: { backgroundColor: COLORS.successLight, borderColor: '#6EE7B7', borderWidth: 1 },

    badge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 8, paddingVertical: 2, borderBottomLeftRadius: RADIUS.sm },
    badgeText: { fontSize: 8, fontWeight: 'bold', color: '#fff' },

    iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    iconBoxComplete: { backgroundColor: COLORS.success },
    subName: { fontSize: 11, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', height: 32 },

    indicators: { flexDirection: 'row', gap: 4, marginTop: 8 },
    miniBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, backgroundColor: COLORS.mutedLight },
    miniBadgeDone: { backgroundColor: COLORS.success },
    miniBadgeText: { fontSize: 8, fontWeight: 'bold', color: COLORS.muted },
    miniBadgeTextDone: { color: '#fff' },
    resolveAreaBtn: {
        marginTop: 10,
        backgroundColor: COLORS.dangerLight,
        borderWidth: 1,
        borderColor: COLORS.danger,
        borderRadius: RADIUS.sm,
        paddingVertical: 4,
        paddingHorizontal: 10,
        width: '100%',
        alignItems: 'center',
    },
    resolveAreaBtnText: { fontSize: 9, fontWeight: '900', color: COLORS.danger },

    footer: { position: 'absolute', bottom: SPACING.xl, left: SPACING.xl, right: SPACING.xl },
    finalizeBtn: { backgroundColor: COLORS.secondary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 10, gap: SPACING.sm, elevation: 4 },
    finalizeBtnDisabled: { backgroundColor: COLORS.muted, elevation: 0 },
    finalizeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

    backBtnInline: { marginTop: SPACING.md, alignSelf: 'center' },
    backBtnTextInline: { fontSize: 12, color: COLORS.textSecondary, fontWeight: 'bold', textDecorationLine: 'underline' },

    lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.danger, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill },
    lockedText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 30 },
    modalContent: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: 25, alignItems: 'center', width: '100%' },
    modalIconBox: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xl },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.sm },
    modalMsg: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 25 },
    modalActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, padding: 15, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: COLORS.mutedLight },
    cancelBtnText: { color: COLORS.textSecondary, fontWeight: 'bold' },
    confirmBtn: { flex: 2, padding: 15, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: COLORS.secondary },
    confirmBtnText: { color: '#fff', fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default CommissionaryDashboardScreen;
