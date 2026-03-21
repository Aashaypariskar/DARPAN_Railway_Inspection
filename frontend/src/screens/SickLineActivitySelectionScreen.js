import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api, { getActivities, getInspectionProgress } from '../api/api';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const SickLineActivitySelectionScreen = ({ route, navigation }) => {
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

    useEffect(() => {
        loadActivities();
        checkMetadata();
    }, []);

    const checkMetadata = async () => {
        try {
            const { getSubcategoryMetadata } = require('../api/api');
            const meta = await getSubcategoryMetadata(params.subcategoryId || params.subcategory_id);
            setSupportsActivityType(meta.supportsActivityType);
        } catch (err) {
            console.log('Metadata check error:', err);
            setSupportsActivityType(true);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadActivities();
            loadStatus();
        }, [params.coachNumber, params.subcategoryId])
    );

    const loadStatus = async () => {
        try {
            const res = await getInspectionProgress({
                session_id: params.session_id,
                module_type: 'SICKLINE'
            });

            if (res) {
                // Local Answers reconciliation
                const localAnswersCount = Object.keys(draft.answers || {}).length;

                // Determine Major/Minor from perSubcategoryStatus if available
                const major = res.perSubcategoryStatus?.find(s => s.name === 'Major');
                const minor = res.perSubcategoryStatus?.find(s => s.name === 'Minor');

                if (major && minor) {
                    setMajorProgress({ 
                        answered: Math.max(major.answered, (draft.activity?.type === 'Major' ? localAnswersCount : 0)), 
                        total: major.total 
                    });
                    setMinorProgress({ 
                        answered: Math.max(minor.answered, (draft.activity?.type === 'Minor' ? localAnswersCount : 0)), 
                        total: minor.total 
                    });
                } else {
                    const exam = res.perSubcategoryStatus?.find(s => s.name === 'Examination');
                    if (exam) {
                         setMajorProgress({ 
                            answered: Math.max(exam.answered, localAnswersCount), 
                            total: exam.total 
                        });
                    } else {
                        setMajorProgress({ answered: Math.max(res.answeredCount, localAnswersCount), total: res.totalCount });
                    }
                }

                setSessionId(params.session_id);
            }
        } catch (err) {
            console.log('Status load error:', err);
        }
    };

    const loadActivities = async () => {
        try {
            // Reusing getActivities since it uses standard Master tables
            const data = await getActivities(params.coachId, 'Sick Line Examination', params.subcategoryId || params.subcategory_id);
            setActivities(data);
        } catch (err) {
            Alert.alert('Error', 'Could not get activities');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (act) => {
        setDraft(prev => ({ ...prev, activity: act, category: params.categoryName }));

        navigation.navigate('SickLineQuestions', {
            ...params,
            activityId: act?.id || null,
            activityType: act?.type || null,
            compartmentId: 'NA'
        });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

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

            <Text style={styles.title}>Select Activity Type</Text>

            {supportsActivityType === false ? (
                <View style={[styles.tabContainer, { justifyContent: 'center' }]}>
                    <TouchableOpacity
                        style={[styles.tab, styles.tabMajor, { width: '90%', height: 200 }]}
                        onPress={() => handleSelect(activities.length ? activities[0] : { id: null, type: null })}
                    >
                        <Text style={[styles.tabText, styles.tabMajorText]}>Start Inspection</Text>
                        <Text style={[styles.subText, styles.tabMajorText]}>Complete check for this area</Text>
                    </TouchableOpacity>

                    {canManageAssets && (
                        <TouchableOpacity
                            style={styles.adminEditBtn}
                            onPress={() => navigation.navigate('QuestionManagement', {
                                activityId: activities.length ? activities[0].id : null,
                                activityType: activities.length ? activities[0].type : null,
                                categoryName: 'Sick Line Examination',
                                subcategoryId: params.subcategoryId || params.subcategory_id
                            })}
                        >
                            <Ionicons name="settings-outline" size={14} color="#2563eb" />
                            <Text style={styles.adminEditBtnText}>Edit Inspection Questions</Text>
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

                                        if (isComplete) {
                                            return (
                                                <View style={styles.statusBadge}>
                                                    <Ionicons name="checkmark-circle" size={12} color="#fff" />
                                                    <Text style={styles.badgeText}>Completed</Text>
                                                </View>
                                            );
                                        } else if (isInProgress) {
                                            return (
                                                <View style={[styles.statusBadge, { backgroundColor: '#f59e0b' }]}>
                                                    <Ionicons name="time" size={12} color="#fff" />
                                                    <Text style={styles.badgeText}>In Progress</Text>
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
                                        categoryName: params.categoryName,
                                        subcategoryId: params.subcategoryId || params.subcategory_id
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
                        module_type: 'sickline',
                        coach_number: params.coachNumber
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
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
    pills: { flexDirection: 'row', marginBottom: 20 },
    pill: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 8 },
    activePill: { backgroundColor: '#2563eb' },
    pillText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b', marginBottom: 40 },
    tabContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    activityWrapper: { width: '48%', alignItems: 'center' },
    tab: {
        width: '100%',
        height: 160,
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10
    },
    adminEditBtn: {
        marginTop: 15,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bfdbfe'
    },
    adminEditBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2563eb',
        marginLeft: 6
    },
    tabMinor: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#e2e8f0' },
    tabMajor: { backgroundColor: '#1e293b' },
    defectsBtnFull: {
        marginTop: 30,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
        borderColor: '#ef4444',
        borderStyle: 'dashed',
        elevation: 4,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    defectsBtnContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    defectsBtnLeading: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    defectsBtnTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ef4444',
        marginLeft: 10
    },
    defectsBadge: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12
    },
    defectsBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold'
    },
    defectsBtnSub: {
        fontSize: 13,
        color: '#7f1d1d',
        opacity: 0.7
    },
    tabIcon: { fontSize: 32, marginBottom: 12 },
    tabText: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    tabMajorText: { color: '#fff' },
    subText: { fontSize: 12, color: '#64748b', marginTop: 5 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    titleRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    statusBadge: { 
        backgroundColor: '#10b981', 
        paddingHorizontal: 10, 
        paddingVertical: 5, 
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});

export default SickLineActivitySelectionScreen;
