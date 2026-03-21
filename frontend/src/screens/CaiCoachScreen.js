import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { getCaiCoaches, createCaiCoach, startCaiSession, deleteCaiCoach, getCaiProgress } from '../api/api';
import { useStore } from '../store/StoreContext';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const CaiCoachScreen = ({ navigation }) => {
    const { user } = useStore();
    const canManageAssets = user?.role === 'Admin' || user?.role === 'SUPER_ADMIN' || user?.role === 'SuperAdmin';
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
            const data = await getCaiCoaches();
            setCoaches(data);
            
            // Fetch progress for each coach
            const progressMap = {};
            await Promise.all(data.map(async (c) => {
                try {
                    const prog = await getCaiProgress(c.coach_number);
                    progressMap[c.coach_number] = prog;
                } catch (e) {
                    // No session or progress yet
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
        React.useCallback(() => {
            loadCoaches();
        }, [])
    );

    const handleCreateCoach = async () => {
        if (!coachNumber.trim()) return Alert.alert('Error', 'Coach number is required');

        try {
            setSubmitting(true);
            await createCaiCoach({
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
                            await deleteCaiCoach(coach.id);
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

        const answered = prog.answered;
        const total = prog.total;
        const statusVal = prog.status;

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
            const { session_id, status: sessionStatus } = await startCaiSession(coach.id);
            navigation.navigate('CaiQuestionsScreen', {
                session_id: session_id,
                session_status: sessionStatus,
                coach_id: coach.id,
                coach_number: coach.coach_number,
                category_name: 'CAI / Modifications',
                module_type: 'CAI'
            });
        } catch (err) {
            Alert.alert('Error', 'Failed to initialize session');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !isModalVisible) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title="CAI / Modifications"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.content}>
                <Text style={styles.title}>Manage Coaches</Text>
                <Text style={styles.subtitle}>Select a coach for CAI modification checklists</Text>

                {canManageAssets && (
                    <TouchableOpacity
                        style={styles.createBtn}
                        onPress={() => setIsModalVisible(true)}
                    >
                        <Ionicons name="add-circle-outline" size={24} color="#fff" />
                        <Text style={styles.createBtnText}>Create New Coach</Text>
                    </TouchableOpacity>
                )}

                <ScrollView style={styles.coachList} showsVerticalScrollIndicator={false}>
                    {coaches.map(coach => (
                        <TouchableOpacity
                            key={coach.id}
                            style={styles.coachCard}
                            onPress={() => handleSelectCoach(coach)}
                        >
                            <View style={styles.coachInfo}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Text style={styles.coachNum}>{coach.coach_number}</Text>
                                    {renderProgressBadge(progressData[coach.coach_number])}
                                </View>
                                <Text style={styles.coachType}>{coach.coach_type || 'General'}</Text>
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
                                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                            </View>
                        </TouchableOpacity>
                    ))}
                    {coaches.length === 0 && !loading && (
                        <View style={styles.empty}>
                            <Ionicons name="bus-outline" size={48} color="#e2e8f0" />
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
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.label}>Coach Number</Text>
                            <TextInput
                                style={[styles.input, { color: COLORS.textPrimary }]}
                                placeholder="e.g., 22436-B1"
                                value={coachNumber}
                                onChangeText={setCoachNumber}
                            />

                            <Text style={styles.label}>Coach Type (Optional)</Text>
                            <TextInput
                                style={[styles.input, { color: COLORS.textPrimary }]}
                                placeholder="e.g., LHB AC 3-Tier"
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
    content: { flex: 1, padding: 25 },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 5, marginBottom: 25 },
    createBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, padding: 16, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, marginBottom: 25 },
    createBtnText: { color: COLORS.surface, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    coachList: { flex: 1 },
    coachCard: { flexDirection: 'row', backgroundColor: COLORS.surface, padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, elevation: 1 },
    coachInfo: { flex: 1 },
    coachNum: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
    badgePending: { backgroundColor: COLORS.border },
    badgeWarning: { backgroundColor: '#f59e0b' },
    badgeSuccess: { backgroundColor: '#10b981' },
    badgeText: { fontSize: 10, color: COLORS.surface, fontWeight: 'bold' },
    coachType: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    coachCardRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    deleteBtn: { padding: SPACING.xs },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: COLORS.placeholder, fontSize: 14, marginTop: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 25 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
    modalBody: { paddingBottom: 20 },
    label: { fontSize: 14, fontWeight: 'bold', color: COLORS.textSecondary, marginBottom: 8 },
    input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 15, fontSize: 16, color: COLORS.textPrimary, marginBottom: 20 },
    submitBtn: { backgroundColor: COLORS.secondary, padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    submitBtnText: { color: COLORS.surface, fontSize: 16, fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }
});

export default CaiCoachScreen;
