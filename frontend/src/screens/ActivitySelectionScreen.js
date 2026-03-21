import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api, { getActivities, getSubcategoryMetadata, getCommissionaryProgress } from '../api/api';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

/**
 * Activity Selection Screen
 * Features side-by-side segmented tabs for Minor/Major
 */
const ActivitySelectionScreen = ({ route, navigation }) => {
    const params = route.params;
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const { setDraft, user, draft } = useStore();
    const canManageAssets = user?.role === 'Admin' || user?.role === 'SUPER_ADMIN' || user?.role === 'SuperAdmin';
    const [majorProgress, setMajorProgress] = useState({ answered: 0, total: 0 });
    const [minorProgress, setMinorProgress] = useState({ answered: 0, total: 0 });
    const [pendingDefectsCount, setPendingDefectsCount] = useState(0);
    const [sessionId, setSessionId] = useState(null);

    const [supportsActivityType, setSupportsActivityType] = useState(true);
    const isPitLine = params?.module_type === 'PITLINE';

    useEffect(() => {
        loadActivities();
        checkMetadata();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadActivities();
            loadStatus();
        }, [params.coach_number, params.subcategory_id, isPitLine])
    );

        const loadStatus = async () => {
            try {
                const moduleType = params.module_type;
                const coachNumber = params.coach_number;
    
                if (!coachNumber || coachNumber === 'undefined') {
                    console.log('[ActivitySelection] Skipping status load: coach_number is missing or undefined');
                    return;
                }
    
                const res = await getCommissionaryProgress(coachNumber, moduleType);

            if (res) {
                // Local Answers reconciliation
                const localAnswersCount = Object.keys(draft.answers || {}).length;

                // Determine Major/Minor from perSubcategoryStatus if available
                const subStatus = res.perSubcategoryStatus?.find(s => s.id === params.subcategory_id);
                const major = res.perSubcategoryStatus?.find(s => s.name === 'Major');
                const minor = res.perSubcategoryStatus?.find(s => s.name === 'Minor');

                if (major && minor) {
                    setMajorProgress({ answered: major.answered, total: major.total });
                    setMinorProgress({ answered: minor.answered, total: minor.total });
                } else if (subStatus) {
                    // Use granular counts (majorTotal, etc.) if backend provided them on the subcategory object
                    setMajorProgress({ 
                        answered: subStatus.majorAnswered !== undefined ? subStatus.majorAnswered : subStatus.answered, 
                        total: subStatus.majorTotal !== undefined ? subStatus.majorTotal : subStatus.total 
                    });
                    setMinorProgress({ 
                        answered: subStatus.minorAnswered !== undefined ? subStatus.minorAnswered : subStatus.answered, 
                        total: subStatus.minorTotal !== undefined ? subStatus.minorTotal : subStatus.total 
                    });
                } else {
                    setMajorProgress({ answered: res.answeredCount, total: res.totalCount });
                    setMinorProgress({ answered: res.answeredCount, total: res.totalCount });
                }

                setSessionId(params.session_id);
            }

            // Defects count still uses the same old logic for now or we can use res.pendingDefects if we added it
            if (isPitLine) {
                const defectsRes = await api.get('/inspection/defects', {
                    params: {
                        type: 'PITLINE',
                        train_id: params.train_id,
                        coach_id: params.coach_id,
                        session_id: params.session_id
                    }
                });
                setPendingDefectsCount(defectsRes.data.defects?.length || 0);
            }
        } catch (err) {
            console.log('Status load error:', err);
        }
    };

    const checkMetadata = async () => {
        try {
            const subId = params.subcategory_id || params.subcategoryId;
            const meta = await getSubcategoryMetadata(subId);
            setSupportsActivityType(meta.supportsActivityType);
        } catch (err) {
            console.log('Metadata check error:', err);
            setSupportsActivityType(true); // Default to true on error
        }
    };

    const loadActivities = async () => {
        try {
            if (isPitLine) {
                // Hardcode Major/Minor for Pit Line as per Requirement Part 3
                setActivities([
                    { id: 'pit_major', type: 'Major' },
                    { id: 'pit_minor', type: 'Minor' }
                ]);
                setLoading(false);
                return;
            }

            const categoryName = params.category_name || params.categoryName;
            const subId = params.subcategory_id || params.subcategoryId;
            const data = await getActivities(params.coach_id || params.coachId, categoryName, subId);
            setActivities(data);
        } catch (err) {
            Alert.alert('Error', 'Could not get activities');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (act) => {
        const category_name = params.category_name;
        setDraft(prev => ({ ...prev, activity: act, category: category_name }));

        const module_type = params.module_type;
        const screen = (module_type === 'COMMISSIONARY' || module_type === 'AMENITY') ? 'CommissionaryQuestions' : 'QuestionsScreen';

        const subId = params.subcategory_id || params.subcategoryId;
        const isUndergear =
            params.subcategoryName === 'Undergear' ||
            category_name === 'Undergear' ||
            params.area_name === 'Undergear' ||
            Number(subId) === 179 ||
            (module_type === 'COMMISSIONARY' && Number(subId) === 185);

        const final_category_name = isUndergear ? 'Undergear' : category_name;

        if (!module_type || !final_category_name) {
            console.error('[NAVIGATION ERROR] Missing context in ActivitySelection', { module_type, final_category_name });
            Alert.alert('Navigation Error', 'Invalid module context.');
            return;
        }

        // Requirement Part 10: Param propagation
        navigation.navigate(screen, {
            ...params,
            category_name: final_category_name,
            activity_id: isUndergear ? null : act.id,
            activity_type: isUndergear ? null : act.type,
            compartment_id: params.compartment_id || 'NA',
            status: params.status,
            module_type: module_type,
            activities: activities // Enable guided navigation
        });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title="Select Activity"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.content}>
                <View style={styles.badgeRow}>
                    <View style={styles.badge}><Text style={styles.badgeText}>COACH: {params.coach_number}</Text></View>
                    <View style={[styles.badge, styles.activeBadge]}>
                        <Text style={[styles.badgeText, { color: '#fff' }]}>
                            {isPitLine ? 'Pit Line' : (params.category_name)}
                        </Text>
                    </View>
                </View>

                <Text style={styles.title}>Select Activity Type</Text>

                {supportsActivityType === false || params.area_name === 'Undergear' || params.category_name === 'Undergear' || params.subcategoryName === 'Undergear' ? (
                    <View style={styles.singleModeContainer}>
                        <TouchableOpacity
                            style={[styles.tab, styles.tabMajor, { width: '100%', height: 200 }]}
                            onPress={() => handleSelect(activities.length ? activities[0] : { id: null, type: null })}
                        >
                            <Text style={styles.tabIcon}>📋</Text>
                            <Text style={[styles.tabText, styles.tabMajorText]}>Start Inspection</Text>
                            <Text style={[styles.subText, styles.tabMajorText]}>Complete check for this area</Text>
                        </TouchableOpacity>

                        {canManageAssets && (
                            <TouchableOpacity
                                style={[styles.adminEditBtn, { alignSelf: 'center', marginTop: 20, paddingHorizontal: 20, paddingVertical: 12 }]}
                                onPress={() => navigation.navigate('QuestionManagement', {
                                    activityId: activities.length ? activities[0].id : null,
                                    activityType: activities.length ? activities[0].type : null,
                                    categoryName: (params.area_name === 'Undergear' || params.category_name === 'Undergear' || params.subcategoryName === 'Undergear' || params.subcategory_id == '179' || params.subcategoryId == '179' || (params.module_type === 'COMMISSIONARY' && (params.subcategory_id == '185' || params.subcategoryId == '185'))) ? 'Undergear' : (params.category_name || params.categoryName),
                                    subcategoryId: params.subcategory_id || params.subcategoryId,
                                    module_type: params.module_type || params.type,
                                    scheduleId: params.scheduleId || params.schedule_id,
                                    coachId: params.coachId || params.coach_id
                                })}
                            >
                                <Ionicons name="settings-outline" size={16} color="#2563eb" />
                                <Text style={[styles.adminEditBtnText, { fontSize: 14 }]}>Edit Questions</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View style={styles.tabContainer}>
                        {activities.map(act => (
                            <View key={act.id} style={styles.activityWrapper}>
                                <TouchableOpacity
                                    style={[styles.tab, act.type === 'Major' ? styles.tabMajor : styles.tabMinor]}
                                    onPress={() => handleSelect(act)}
                                >
                                    <View style={styles.titleRow}>
                                        <Text style={styles.tabIcon}>{act.type === 'Minor' ? '📝' : '⚡'}</Text>
                                        {(() => {
                                            const prog = act.type === 'Major' ? majorProgress : minorProgress;
                                            const isComplete = prog.total > 0 && prog.answered === prog.total;
                                            const isInProgress = !isComplete && prog.answered > 0;
                                            const countText = prog.total > 0 ? `(${prog.answered}/${prog.total})` : "";

                                            if (isComplete) {
                                                return (
                                                    <View style={styles.statusBadge}>
                                                        <Ionicons name="checkmark-circle" size={12} color="#fff" />
                                                        <Text style={styles.statusBadgeText}>Completed {countText}</Text>
                                                    </View>
                                                );
                                            } else if (isInProgress) {
                                                return (
                                                    <View style={[styles.statusBadge, { backgroundColor: '#f59e0b' }]}>
                                                        <Ionicons name="time" size={12} color="#fff" />
                                                        <Text style={styles.statusBadgeText}>In Progress {countText}</Text>
                                                    </View>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </View>
                                    <Text style={[styles.tabText, act.type === 'Major' && styles.tabMajorText]}>{act.type}</Text>
                                    <Text style={[styles.subText, act.type === 'Major' && styles.tabMajorText]}>{act.type === 'Minor' ? 'Regular Check' : 'Deep Audit'}</Text>
                                </TouchableOpacity>

                                {canManageAssets && (
                                    <TouchableOpacity
                                        style={styles.adminEditBtn}
                                        onPress={() => navigation.navigate('QuestionManagement', {
                                            activityId: act.id,
                                            activityType: act.type,
                                            categoryName: (params.area_name === 'Undergear' || params.category_name === 'Undergear' || params.subcategoryName === 'Undergear' || params.subcategory_id == '179' || params.subcategoryId == '179' || (params.module_type === 'COMMISSIONARY' && (params.subcategory_id == '185' || params.subcategoryId == '185'))) ? 'Undergear' : (params.category_name || params.categoryName),
                                            subcategoryId: params.subcategory_id || params.subcategoryId,
                                            module_type: params.module_type || params.type,
                                            scheduleId: params.scheduleId || params.schedule_id,
                                            coachId: params.coachId || params.coach_id
                                        })}
                                    >
                                        <Ionicons name="settings-outline" size={14} color="#2563eb" />
                                        <Text style={styles.adminEditBtnText}>Edit {act.type} Questions</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {pendingDefectsCount > 0 && (
                    <TouchableOpacity
                        style={styles.defectsBtnFull}
                        onPress={() => navigation.navigate('Defects', {
                            session_id: sessionId,
                            module_type: params.module_type,
                            coach_number: params.coach_number || params.coachNumber,
                            train_id: params.train_id,
                            coach_id: params.coach_id
                        })}
                    >
                        <View style={styles.defectsBtnContent}>
                            <View style={styles.defectsBtnLeading}>
                                <Ionicons name="build" size={24} color="#ef4444" />
                                <Text style={styles.defectsBtnTitle}>View Pending Defects</Text>
                            </View>
                            <View style={styles.defectsBadge}>
                                <Text style={styles.defectsBadgeText}>{pendingDefectsCount}</Text>
                            </View>
                        </View>
                        <Text style={styles.defectsBtnSub}>Tap to resolve {pendingDefectsCount} reported issues</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, padding: SPACING.xl },
    badgeRow: { flexDirection: 'row', marginBottom: SPACING.lg, gap: SPACING.sm },
    badge: { backgroundColor: COLORS.disabled, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md },
    activeBadge: { backgroundColor: COLORS.secondary },
    badgeText: { fontSize: 12, fontWeight: 'bold', color: COLORS.textSecondary },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.xxl },
    tabContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    activityWrapper: { width: '48%', alignItems: 'center' },
    tab: {
        width: '100%',
        height: 160,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8
    },
    tabMinor: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    tabMajor: { backgroundColor: COLORS.primary },
    tabIcon: { fontSize: 32, marginBottom: SPACING.sm },
    tabText: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
    tabMajorText: { color: COLORS.surface },
    subText: { fontSize: 12, color: COLORS.textSecondary, marginTop: SPACING.xs },
    titleRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm
    },
    statusBadge: {
        backgroundColor: COLORS.success,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    statusBadgeText: {
        color: COLORS.surface,
        fontSize: 10,
        fontWeight: 'bold'
    },
    adminEditBtn: {
        marginTop: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingVertical: 8,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: '#bfdbfe'
    },
    adminEditBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.secondary,
        marginLeft: 6
    },
    defectsBtnFull: {
        marginTop: SPACING.xxl,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 2,
        borderColor: COLORS.danger,
        borderStyle: 'dashed',
        elevation: 2
    },
    defectsBtnContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm
    },
    defectsBtnLeading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm
    },
    defectsBtnTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.danger
    },
    defectsBadge: {
        backgroundColor: COLORS.danger,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: RADIUS.md
    },
    defectsBadgeText: {
        color: COLORS.surface,
        fontSize: 12,
        fontWeight: 'bold'
    },
    defectsBtnSub: {
        fontSize: 13,
        color: COLORS.textSecondary
    },
    singleModeContainer: {
        width: '100%',
        paddingHorizontal: 0
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default ActivitySelectionScreen;
