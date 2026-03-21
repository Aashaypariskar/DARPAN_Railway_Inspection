import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store/StoreContext';
import api, { getCommissionaryCoaches, getCommissionarySession, createCommissionaryCoach, getCoaches, deleteCommissionaryCoach, getWspSession, getSickLineSession, getCommissionaryProgress, getWspProgress } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const CommissionaryCoachScreen = ({ route, navigation }) => {
    const { user } = useStore();
    const canManageAssets = user?.role === 'Admin' || user?.role === 'SUPER_ADMIN' || user?.role === 'SuperAdmin';
    const category_name = route?.params?.category_name || route?.params?.category || 'Coach Commissionary';
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [progressData, setProgressData] = useState({});
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Create Coach Form State
    const [coachNumber, setCoachNumber] = useState('');
    const [coachType, setCoachType] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadCoaches = async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            else setRefreshing(true);
            let data;
            if (category_name === 'Coach Commissionary') {
                data = await getCommissionaryCoaches();
            } else {
                data = await getCoaches(null, category_name);
            }
            setCoaches(data);

            // Fetch progress for each coach
            const progressMap = {};
            await Promise.all(data.map(async (c) => {
                try {
                    let prog;
                    if (category_name === 'Coach Commissionary') {
                        prog = await getCommissionaryProgress(c.coach_number);
                    } else if (category_name === 'WSP Examination' || category_name === 'WSP') {
                        prog = await getWspProgress(c.coach_number);
                    } else if (category_name === 'Amenity') {
                        prog = await getCommissionaryProgress(c.coach_number, 'AMENITY');
                    } else if (category_name === 'Sick Line Examination' || category_name === 'SICKLINE') {
                        const sess = await getSickLineSession(c.coach_number);
                        if (sess && sess.id) {
                            prog = await getSickLineProgress(sess.id);
                        }
                    }
                    if (prog) progressMap[c.coach_number] = prog;
                } catch (e) {
                    console.error(`Progress fetch failed for ${c.coach_number}`, e);
                }
            }));
            setProgressData(progressMap);
        } catch (err) {
            Alert.alert('Error', 'Failed to fetch coaches');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadCoaches();
        }, [category_name])
    );

    const onRefresh = () => {
        loadCoaches(true);
    };

    const handleCreateCoach = async () => {
        if (!canManageAssets) {
            Alert.alert('Permission Denied', 'Only Admins can create coaches.');
            return;
        }
        if (!coachNumber.trim()) return Alert.alert('Error', 'Coach number is required');

        try {
            setSubmitting(true);
            await createCommissionaryCoach({
                coach_number: coachNumber.trim(),
                coach_type: coachType.trim()
            });
            setIsModalVisible(false);
            setCoachNumber('');
            setCoachType('');
            loadCoaches();
            Alert.alert('Success', 'Coach created successfully');
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to create coach');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCoach = async (coach) => {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete coach ${coach.coach_number}? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await deleteCommissionaryCoach(coach.id);
                            Alert.alert('Success', 'Coach deleted successfully');
                            loadCoaches();
                        } catch (err) {
                            Alert.alert('Error', err.response?.data?.error || 'Failed to delete coach');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderProgressBadge = (prog) => {
        if (!prog) {
            return <View style={[styles.badge, styles.badgePending]}><Text style={styles.badgeText}>PENDING</Text></View>;
        }

        // Handle various response shapes
        const answered = prog.answeredCount !== undefined ? prog.answeredCount : (prog.data?.answered !== undefined ? prog.data.answered : prog.answered);
        const total = prog.totalCount !== undefined ? prog.totalCount : (prog.data?.total !== undefined ? prog.data.total : prog.total);
        const statusVal = prog.status || prog.data?.status;

        if (total === undefined || total === null) {
            return <View style={[styles.badge, styles.badgePending]}><Text style={styles.badgeText}>PENDING</Text></View>;
        }

        const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
        let status = 'NOT_STARTED';
        let badgeStyle = styles.badgePending;

        if (statusVal === 'SUBMITTED' || statusVal === 'COMPLETED' || (answered === total && total > 0)) {
            status = 'COMPLETED';
            badgeStyle = styles.badgeSuccess;
        } else if (answered > 0 || statusVal === 'IN_PROGRESS' || statusVal === 'DRAFT') {
            status = 'IN_PROGRESS';
            badgeStyle = styles.badgeWarning;
        }

        const countText = total > 0 ? `(${answered}/${total})` : "";
        return (
            <View style={[styles.badge, badgeStyle]}>
                <Text style={styles.badgeText}>{status} {countText} {percent}%</Text>
            </View>
        );
    };

    const handleSelectCoach = async (coach) => {
        try {
            setLoading(true);
            const category_name = route?.params?.category_name || route?.params?.category || 'Coach Commissionary';
            
            const module_type = category_name === 'Amenity' ? 'AMENITY' : (category_name === 'Sick Line Examination' || category_name === 'SICKLINE' ? 'SICKLINE' : (category_name === 'WSP Examination' || category_name === 'WSP' ? 'WSP' : 'COMMISSIONARY'));
            const final_category_name = category_name === 'WSP' ? 'WSP Examination' : (category_name === 'SICKLINE' ? 'Sick Line Examination' : category_name);

            let sessionData = null;

            if (module_type === 'WSP') {
                sessionData = await getWspSession(coach.coach_number);
            } else if (module_type === 'SICKLINE') {
                sessionData = await getSickLineSession(coach.coach_number);
            } else {
                // Amenity and Commissionary
                sessionData = await getCommissionarySession(coach.coach_number);
            }

            const nextParams = {
                ...route.params,
                coach_id: coach.id,
                coach_number: coach.coach_number,
                session_id: sessionData?.data?.id || sessionData?.data?.session_id || sessionData?.id || sessionData?.session_id || sessionData?.sessionId,
                status: sessionData?.status,
                module_type: module_type,
                category_name: final_category_name
            };

            if (!nextParams.session_id) {
                Alert.alert('Fatal Error', 'Session ID is missing or failed to generate. Please check backend connection.');
                setLoading(false);
                return;
            }

            if (module_type === 'WSP') {
                navigation.navigate('WspScheduleScreen', {
                    ...nextParams,
                    mode: 'INDEPENDENT'
                });
            } else if (module_type === 'AMENITY' || module_type === 'COMMISSIONARY') {
                navigation.navigate('AmenitySubcategory', nextParams);
            } else if (module_type === 'SICKLINE') {
                navigation.navigate('ActivitySelection', nextParams);
            } else {
                // Fallback for other categories
                navigation.navigate('ActivitySelection', nextParams);
            }
        } catch (err) {
            console.error('[SESSION INIT ERROR]', err);
            Alert.alert('Error', 'Failed to initialize session. Check if backend is running.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !refreshing && !isModalVisible) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title={category_name === 'Coach Commissionary' ? 'Coach Commissioning' : category_name}
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.content}>
                <Text style={styles.title}>Manage Coaches</Text>
                <Text style={styles.subtitle}>Select an existing coach or create a new one</Text>

                {canManageAssets && (
                    <TouchableOpacity
                        style={styles.createBtn}
                        onPress={() => setIsModalVisible(true)}
                    >
                        <Ionicons name="add-circle-outline" size={24} color="#fff" />
                        <Text style={styles.createBtnText}>Create New Coach</Text>
                    </TouchableOpacity>
                )}

                <ScrollView
                    style={styles.coachList}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[COLORS.secondary]}
                            tintColor={COLORS.secondary}
                        />
                    }
                >
                    {coaches.map(coach => (
                        <TouchableOpacity
                            key={coach.id}
                            style={styles.coachCard}
                            onPress={() => handleSelectCoach(coach)}
                        >
                            <View style={styles.coachInfo}>
                                <Text style={styles.coachNum}>{coach.coach_number}</Text>
                                <Text style={styles.coachType}>{coach.coach_type || 'General'}</Text>
                                {renderProgressBadge(progressData[coach.coach_number])}
                            </View>
                            <View style={styles.coachCardRight}>
                                {canManageAssets && (
                                    <TouchableOpacity
                                        style={styles.deleteBtn}
                                        onPress={() => handleDeleteCoach(coach)}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                                    </TouchableOpacity>
                                )}
                                <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
                            </View>
                        </TouchableOpacity>
                    ))}
                    {coaches.length === 0 && !loading && (
                        <View style={styles.empty}>
                            <Ionicons name="bus-outline" size={48} color={COLORS.disabled} />
                            <Text style={styles.emptyText}>No coaches found. Create one to start.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            {/* Create Coach Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Coach Registration</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.label}>Coach Number</Text>
                            <TextInput
                                style={[styles.input, { color: COLORS.textPrimary }]}
                                placeholder="e.g., 22436-B1"
                                placeholderTextColor={COLORS.placeholder}
                                value={coachNumber}
                                onChangeText={setCoachNumber}
                            />

                            <Text style={styles.label}>Coach Type (Optional)</Text>
                            <TextInput
                                style={[styles.input, { color: COLORS.textPrimary }]}
                                placeholder="e.g., LHB AC 3-Tier"
                                placeholderTextColor={COLORS.placeholder}
                                value={coachType}
                                onChangeText={setCoachType}
                            />

                            <TouchableOpacity
                                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                                onPress={handleCreateCoach}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Save Coach</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, padding: SPACING.xl },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: SPACING.xl },
    createBtn: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        marginBottom: SPACING.xl
    },
    createBtnText: { color: COLORS.surface, fontSize: 16, fontWeight: 'bold', marginLeft: SPACING.sm },
    coachList: { flex: 1 },
    coachCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 1
    },
    coachInfo: { flex: 1 },
    coachNum: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    coachType: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    coachCardRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    deleteBtn: { padding: SPACING.xs },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: COLORS.placeholder, fontSize: 14, marginTop: SPACING.md },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
    modalBody: { paddingBottom: SPACING.xl },
    label: { fontSize: 14, fontWeight: 'bold', color: COLORS.textSecondary, marginBottom: SPACING.xs },
    input: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        padding: 15,
        fontSize: 16,
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
    },
    submitBtn: {
        backgroundColor: COLORS.secondary,
        padding: SPACING.lg,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.sm
    },
    submitBtnText: { color: COLORS.surface, fontSize: 16, fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 6,
    },
    badgePending: { backgroundColor: COLORS.border },
    badgeWarning: { backgroundColor: '#f59e0b' },
    badgeSuccess: { backgroundColor: '#10b981' },
    badgeText: { fontSize: 10, color: COLORS.surface, fontWeight: 'bold' },
});

export default CommissionaryCoachScreen;
