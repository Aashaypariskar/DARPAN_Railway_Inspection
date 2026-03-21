import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getCoaches, getWspSession, getCommissionarySession, getCaiProgress, getWspProgress, getCommissionaryProgress, getSickLineSession, getSickLineProgress } from '../api/api';
import { useStore } from '../store/StoreContext';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

/**
 * Modern Coach Selection Screen
 * Features 2-column grid layout with select indicators
 */
const CoachSelectionScreen = ({ route, navigation }) => {
    const params = route.params || {};
    const trainId = params.trainId || params.train_id;
    const trainName = params.trainName || params.train_name;
    const categoryName = params.categoryName || params.category_name;
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [progressData, setProgressData] = useState({});
    const { setDraft } = useStore();

    const loadData = async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            else setRefreshing(true);
            const data = await getCoaches(trainId, categoryName);
            setCoaches(data);

            // Fetch progress for each coach
            const progressMap = {};
            await Promise.all(data.map(async (item) => {
                try {
                    let prog = null;
                    if (categoryName === 'WSP Examination' || categoryName === 'WSP') {
                        prog = await getWspProgress(item.coach_number);
                    } else if (categoryName === 'Amenity') {
                        prog = await getCommissionaryProgress(item.coach_number, 'AMENITY');
                    } else if (categoryName === 'Coach Commissionary') {
                        prog = await getCommissionaryProgress(item.coach_number, 'COMMISSIONARY');
                    } else if (categoryName === 'CAI' || categoryName === 'CAI / Modifications') {
                        prog = await getCaiProgress(item.coach_number);
                    } else if (categoryName === 'Sick Line Examination' || categoryName === 'SICKLINE') {
                        const sess = await getSickLineSession(item.coach_number);
                        if (sess && sess.id) prog = await getSickLineProgress(sess.id);
                    }
                    if (prog) progressMap[item.coach_number] = prog;
                } catch (e) {
                    // Silently ignore progress errors for individual coaches
                }
            }));
            setProgressData(progressMap);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [trainId, categoryName])
    );

    const onRefresh = () => {
        loadData(true);
    };

    const handleSelect = async (item) => {
        try {
            setLoading(true);
            setDraft(prev => ({ ...prev, coach: item, category: categoryName }));

            let sessionId = null;
            let status = null;

            // Session acquisition for WSP and AMENITY
            if (categoryName === 'WSP Examination') {
                const session = await getWspSession(item.coach_number);
                sessionId = session.id;
                status = session.status;
            } else if (categoryName === 'Amenity' || categoryName === 'Coach Commissionary') {
                const session = await getCommissionarySession(item.coach_number);
                sessionId = session.id;
                status = session.status;
            }

            const nextParams = {
                coachId: item.id,
                coachNumber: item.coach_number,
                trainId: trainId,
                trainName: trainName || 'Audit',
                categoryName,
                session_id: sessionId,
                status: status
            };

            if (categoryName === 'WSP Examination') {
                navigation.navigate('WspScheduleScreen', { ...nextParams, mode: 'INDEPENDENT' });
            } else if (categoryName === 'Amenity') {
                navigation.navigate('AmenitySubcategory', nextParams);
            } else {
                navigation.navigate('ActivitySelection', nextParams);
            }
        } catch (err) {
            console.error('[COACH SELECT ERROR]', err);
            Alert.alert('Error', 'Failed to initialize session');
        } finally {
            setLoading(false);
        }
    };

    const renderProgressBadge = (coachNum) => {
        const prog = progressData[coachNum];
        if (!prog) return null;

        // Handle various response shapes
        const answered = prog.answeredCount !== undefined ? prog.answeredCount : (prog.data?.answered !== undefined ? prog.data.answered : (prog.answered !== undefined ? prog.answered : (prog.completedCount !== undefined ? prog.completedCount : 0)));
        const total = prog.totalCount !== undefined ? prog.totalCount : (prog.data?.total !== undefined ? prog.data.total : (prog.total !== undefined ? prog.total : 0));
        const statusVal = prog.status || prog.data?.status;

        const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
        
        let badgeStyle = styles.badgePending;
        let status = 'IN_PROGRESS';

        if (statusVal === 'SUBMITTED' || statusVal === 'COMPLETED' || (answered === total && total > 0)) {
            badgeStyle = styles.badgeSuccess;
            status = 'COMPLETED';
        } else if (answered === 0 && !statusVal) {
            status = 'NOT_STARTED';
        }

        return (
            <View style={[styles.badge, badgeStyle]}>
                <Text style={styles.badgeText}>{status} ({answered}/{total}) {percent}%</Text>
            </View>
        );
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.gridItem} onPress={() => handleSelect(item)} activeOpacity={0.7}>
            <View style={styles.coachCard}>
                <Text style={styles.coachIcon}>🚃</Text>
                <Text style={styles.coachNum}>{item.coach_number}</Text>
                <Text style={styles.type}>{item.coach_type || 'Sleeper/AC'}</Text>
                {renderProgressBadge(item.coach_number)}
            </View>
        </TouchableOpacity>
    );

    if (loading && !refreshing) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title={categoryName || 'Select Coach'}
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            {trainName && (
                <View style={styles.trainInfo}>
                    <Text style={styles.trainLabel}>TRAIN</Text>
                    <Text style={styles.trainValue}>{trainName}</Text>
                </View>
            )}

            <FlatList
                data={coaches}
                numColumns={2}
                renderItem={renderItem}
                keyExtractor={(item, index) => (item?.id || index).toString()}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[COLORS.primary]}
                        tintColor={COLORS.primary}
                    />
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    trainInfo: { paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
    trainLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.textSecondary, backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    trainValue: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary },
    list: { padding: 12 },
    gridItem: { flex: 0.5, padding: 8 },
    coachCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    coachIcon: { fontSize: 32, marginBottom: 8 },
    coachNum: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    type: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    badge: {
        marginTop: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: '#f59e0b', // Default Warning/Progress
    },
    badgeSuccess: {
        backgroundColor: '#10b981',
    },
    badgePending: {
        backgroundColor: COLORS.border,
    },
    badgeText: {
        color: COLORS.surface,
        fontSize: 8,
        fontWeight: 'bold',
    }
});

export default CoachSelectionScreen;
