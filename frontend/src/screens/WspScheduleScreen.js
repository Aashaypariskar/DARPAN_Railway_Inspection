import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getWspSchedules, getWspSession, getInspectionProgress, completeWspSession } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';
import { useStore } from '../store/StoreContext';

const WspScheduleScreen = ({ route, navigation }) => {
    const params = route.params || {};

    const coach_id = params.coach_id || params.coachId;
    const coach_number = params.coach_number || params.coachNumber;
    const category_name = params.category_name || params.categoryName;
    const mode = params.mode || 'INDEPENDENT';
    const sick_line_session_id = params.sick_line_session_id || params.sickLineSessionId;

    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [wspSession, setWspSession] = useState(null);
    // completedSchedules: { [schedule_id]: true } — derived from progress data
    const [completedSchedules, setCompletedSchedules] = useState({});
    const [progress, setProgress] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const isMounted = useRef(false);
    const isFetching = useRef(false);

    const { user } = useStore();
    const canManageAssets = user?.role === 'Admin' || user?.role === 'SUPER_ADMIN' || user?.role === 'SuperAdmin';

    const init = useCallback(async (isRefresh = false) => {
        if (isFetching.current) return;
        isFetching.current = true;

        try {
            if (!isRefresh) setLoading(true);
            else setRefreshing(true);

            // 1. Fetch and deduplicate schedules by id
            const rawSchedules = await getWspSchedules();
            const scheduleMap = {};
            (rawSchedules || []).forEach(s => {
                if (!scheduleMap[s.id]) {
                    scheduleMap[s.id] = s;
                }
            });
            const deduped = Object.values(scheduleMap);
            setSchedules(deduped); // Replace, never append

            // 2. Resolve session — use returned value directly to avoid race condition
            let activeSessionId = null;

            if (mode === 'SICKLINE') {
                activeSessionId = sick_line_session_id;
                setWspSession({ id: activeSessionId });
            } else if (params.module_type === 'pitline_wsp' && params.session_id) {
                activeSessionId = params.session_id;
                setWspSession({ id: activeSessionId });
            } else if (coach_number) {
                const session = await getWspSession(coach_number);
                setWspSession(session);
                activeSessionId = session?.id;
            } else {
                console.warn('[WSP INIT] No coach_number found, skipping session lookup');
            }

            // 3. Fetch progress using the resolved session ID (no state race)
            if (activeSessionId) {
                const prog = await getInspectionProgress({
                    session_id: activeSessionId,
                    module_type: 'WSP'
                });
                setProgress(prog);

                // 4. Build completedSchedules map from per-subcategory progress
                const completionMap = {};
                (prog?.perSubcategoryStatus || []).forEach(s => {
                    if (s.total > 0 && s.answered >= s.total) {
                        completionMap[s.id] = true;
                    }
                });
                setCompletedSchedules(completionMap);
            }
        } catch (err) {
            console.error('[WSP INIT ERROR]', err);
            const errMsg = err.response?.data?.error || err.message || 'Failed to initialize WSP flow';
            Alert.alert('Initialization Error', errMsg);
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setRefreshing(false);
            }
            isFetching.current = false;
        }
    }, [coach_number, mode, sick_line_session_id, params.session_id, params.module_type]);

    React.useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useFocusEffect(
        useCallback(() => {
            init();
        }, [init])
    );

    const onRefresh = () => init(true);

    // Determine if a schedule is unlocked:
    // - First schedule is always unlocked
    // - Subsequent schedules unlock only when previous one is completed
    const isScheduleUnlocked = (index) => {
        if (index === 0) return true;
        const previousSchedule = schedules[index - 1];
        return !!completedSchedules[previousSchedule?.id];
    };

    const handleSelect = (item, index) => {
        if (!isScheduleUnlocked(index)) {
            const prevSchedule = schedules[index - 1];
            Alert.alert(
                'Schedule Locked',
                `Please complete "${prevSchedule?.name || 'the previous schedule'}" first before starting this one.`
            );
            return;
        }

        const sessionId = wspSession?.id || params.session_id;

        navigation.navigate('QuestionsScreen', {
            session_id: sessionId,
            sessionId: sessionId,
            schedule_id: item.id,
            scheduleId: item.id,
            schedule_name: item.name,
            scheduleName: item.name,
            activity_type: item.name, // Added for guided navigation
            module_type: 'WSP',
            mode: mode,
            category_name: category_name,
            categoryName: 'WSP Examination',
            status: wspSession?.status || params.status,
            coach_id: coach_id,
            coach_number: coach_number,
            activities: schedules.map(s => ({ id: s.id, type: s.name })) // Enable Next/Prev logic
        });
    };

    const getScheduleStatus = (item) => {
        const status = progress?.perSubcategoryStatus?.find(s => s.id === item.id);
        const answered = status?.answered || 0;
        const total = status?.total || 0;
        const isComplete = total > 0 && answered >= total;
        return { answered, total, isComplete };
    };

    const handleFinalSubmit = async () => {
        if (!wspSession?.id) {
            Alert.alert("Error", "Session ID not found.");
            return;
        }

        try {
            setSubmitting(true);
            await completeWspSession(wspSession.id, mode);
            Alert.alert(
                "Success",
                "WSP Examination submitted successfully!",
                [{ text: "OK", onPress: () => navigation.navigate('Dashboard') }]
            );
        } catch (error) {
            console.error('[WSP SUBMIT ERROR]', error);
            const msg = error.response?.data?.error || "Failed to submit WSP Examination.";
            Alert.alert("Submission Failed", msg);
        } finally {
            setSubmitting(false);
        }
    };

    const allSchedulesCompleted = schedules.length > 0 && schedules.every((_, i) => isScheduleUnlocked(i) && getScheduleStatus(schedules[i]).isComplete);

    if (loading && !refreshing) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title="WSP Schedules"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] })}
            />

            <View style={styles.content}>
                <Text style={styles.title}>WSP Examination Schedules</Text>
                <Text style={styles.subtitle}>Complete schedules in order. Each schedule unlocks after the previous is done.</Text>

                <FlatList
                    data={schedules}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item, index }) => {
                        const { answered, total, isComplete } = getScheduleStatus(item);
                        const unlocked = isScheduleUnlocked(index);

                        return (
                            <TouchableOpacity
                                style={[
                                    styles.card,
                                    isComplete && styles.cardCompleted,
                                    !unlocked && styles.cardLocked
                                ]}
                                onPress={() => handleSelect(item, index)}
                                activeOpacity={unlocked ? 0.7 : 0.9}
                            >
                                <View style={[styles.iconBg, isComplete && { backgroundColor: COLORS.success + '22' }, !unlocked && { backgroundColor: '#f1f5f9' }]}>
                                    {isComplete ? (
                                        <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                                    ) : !unlocked ? (
                                        <Ionicons name="lock-closed-outline" size={24} color={COLORS.placeholder} />
                                    ) : (
                                        <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
                                    )}
                                </View>

                                <View style={styles.cardContent}>
                                    <Text style={[styles.catTitle, !unlocked && { color: COLORS.placeholder }]}>
                                        {item.name}
                                    </Text>

                                    <View style={styles.statusRow}>
                                        {isComplete ? (
                                            <View style={[styles.statusBadge, { backgroundColor: COLORS.success }]}>
                                                <Ionicons name="checkmark-circle" size={12} color="#fff" />
                                                <Text style={styles.statusBadgeText}>Completed</Text>
                                            </View>
                                        ) : !unlocked ? (
                                            <View style={[styles.statusBadge, { backgroundColor: COLORS.placeholder }]}>
                                                <Ionicons name="lock-closed" size={12} color="#fff" />
                                                <Text style={styles.statusBadgeText}>Locked</Text>
                                            </View>
                                        ) : answered > 0 ? (
                                            <View style={[styles.statusBadge, { backgroundColor: COLORS.warning }]}>
                                                <Ionicons name="time" size={12} color="#fff" />
                                                <Text style={styles.statusBadgeText}>In Progress ({answered}/{total})</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.catSub}>
                                                {index === 0 ? 'Tap to start' : 'Complete previous schedule first'}
                                            </Text>
                                        )}
                                    </View>

                                    {canManageAssets && (
                                        <TouchableOpacity
                                            style={styles.wspEditBtn}
                                            onPress={() => navigation.navigate('QuestionManagement', {
                                                category_name: category_name,
                                                scheduleId: item.id,
                                                coach_id: coach_id,
                                                activityType: item.name
                                            })}
                                        >
                                            <Ionicons name="settings-outline" size={14} color={COLORS.secondary} />
                                            <Text style={styles.wspEditBtnText}>Edit {item.name}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {unlocked && !isComplete ? (
                                    <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                                ) : isComplete ? (
                                    <Ionicons name="checkmark-done-circle-outline" size={22} color={COLORS.success} />
                                ) : (
                                    <Ionicons name="lock-closed-outline" size={20} color={COLORS.placeholder} />
                                )}
                            </TouchableOpacity>
                        );
                    }}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[COLORS.secondary]}
                            tintColor={COLORS.secondary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={48} color={COLORS.disabled} />
                            <Text style={styles.emptyText}>No WSP schedules found.</Text>
                        </View>
                    }
                />
            </View>

            {allSchedulesCompleted && params.module_type !== 'pitline_wsp' && (
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} 
                        onPress={handleFinalSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitBtnText}>FINAL SUBMIT WSP EXAMINATION</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {allSchedulesCompleted && params.module_type === 'pitline_wsp' && (
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[styles.submitBtn, { backgroundColor: COLORS.success }]} 
                        onPress={() => navigation.navigate('PitLineSelectArea', { ...params })}
                    >
                        <Text style={styles.submitBtnText}>PROCEED TO SUBMIT</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, padding: SPACING.xl },
    title: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.xs },
    subtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.xl },
    list: { paddingBottom: 40 },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING.md,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border
    },
    cardCompleted: {
        borderColor: COLORS.success,
        backgroundColor: COLORS.success + '08'
    },
    cardLocked: {
        opacity: 0.65,
        borderColor: COLORS.border,
        backgroundColor: '#f8fafc'
    },
    iconBg: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.mutedLight,
    },
    cardContent: { flex: 1 },
    catTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.textPrimary },
    catSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    wspEditBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: COLORS.primaryLight,
        borderRadius: RADIUS.sm,
        alignSelf: 'flex-start'
    },
    wspEditBtnText: { color: COLORS.secondary, fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 4
    },
    statusBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: COLORS.placeholder, fontSize: 14, marginTop: SPACING.md },
    footer: {
        padding: SPACING.xl,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    submitBtn: {
        backgroundColor: COLORS.success,
        paddingVertical: 16,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});

export default WspScheduleScreen;
